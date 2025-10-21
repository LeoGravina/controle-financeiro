import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js';

// Importando todos os componentes necessários com caminhos e extensões corrigidos
import SummaryCard from '../components/SummaryCard.jsx';
import MonthNavigator from '../components/MonthNavigator.jsx';
import CategoryManager from '../components/CategoryManager.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import TransactionList from '../components/TransactionList.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import EditTransactionModal from '../components/EditTransactionModal.jsx';
import EditCategoryModal from '../components/EditCategoryModal.jsx';

// Paletas de cores para os gráficos
const COLORS_EXPENSE = ['#e74c3c', '#c0392b', '#f39c12', '#d35400', '#9b59b6'];
const COLORS_INCOME = ['#27ae60', '#2ecc71', '#16a085', '#1abc9c', '#00b894'];

// Componente para o Tooltip Personalizado do Gráfico
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        const percent = (data.payload.percent * 100);
        return (
            <div className="custom-tooltip">
                <p className="label">{`${data.name}`}</p>
                <p className="value">{`Valor: ${data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
                <p className="percent">{`Percentual: ${percent.toFixed(1)}%`}</p>
            </div>
        );
    }
    return null;
};

// --- FUNÇÃO AUXILIAR PARA GERAR DADOS DO GRÁFICO ---
const generateChartData = (transactions, type, categories) => {
    const filtered = transactions.filter(t => t.type === type);
    const total = filtered.reduce((acc, t) => acc + t.amount, 0);

    if (total === 0) return [];

    const grouped = filtered.reduce((acc, t) => {
        const categoryName = t.category || 'Outros';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
    }, {});

    // Mapeia os dados e associa a cor da categoria
    return Object.entries(grouped).map(([name, value]) => {
        const category = categories.find(cat => cat.name === name);
        return {
            name,
            value,
            percent: value / total,
            color: category ? category.color : '#bdc3c7' // Usa a cor da categoria ou um cinza padrão
        };
    });
};


const Dashboard = () => {
    // Estados da aplicação
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [formType, setFormType] = useState('expense');
    const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, id: null, type: null });
    const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [listFilter, setListFilter] = useState('all');

    // Efeito para gerenciar a autenticação do usuário
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser || null);
        });
        return () => unsubscribeAuth();
    }, []);

    // Efeito para buscar os dados do Firestore
    useEffect(() => {
        if (!user) {
            setTransactions([]); setCategories([]); setLoading(false);
            return;
        }

        setLoading(true);
        const catQuery = query(collection(db, 'categories'), where('userId', '==', user.uid));
        const unsubCategories = onSnapshot(catQuery, (snapshot) => {
            setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => { console.error("Erro ao buscar categorias:", error); setLoading(false); });

        const transQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const unsubTransactions = onSnapshot(transQuery, (snapshot) => {
            setTransactions(snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                date: d.data().date?.toDate ? d.data().date.toDate() : new Date(),
            })));
            setLoading(false);
        }, (error) => { console.error("Erro ao buscar transações:", error); setLoading(false); });

        return () => { unsubCategories(); unsubTransactions(); };
    }, [user]);

    // --- Funções CRUD ---
    const handleAddTransaction = async (transaction) => {
        if (!user) return;
        const { isInstallment, installments, ...rest } = transaction;
        try {
            if (isInstallment && transaction.type === 'expense' && installments > 1) {
                const installmentAmount = transaction.amount / installments;
                const batch = writeBatch(db);
                for (let i = 0; i < installments; i++) {
                    const installmentDate = new Date(transaction.date);
                    installmentDate.setMonth(installmentDate.getMonth() + i);
                    if (installmentDate.getDate() !== transaction.date.getDate()) {
                        installmentDate.setDate(0);
                    }
                    const newTransactionRef = doc(collection(db, 'transactions'));
                    batch.set(newTransactionRef, {
                        ...rest, userId: user.uid, amount: installmentAmount,
                        description: `${transaction.description} (${i + 1}/${installments})`,
                        date: Timestamp.fromDate(installmentDate),
                        isPaid: false
                    });
                }
                await batch.commit();
            } else {
                await addDoc(collection(db, 'transactions'), { ...rest, userId: user.uid, date: Timestamp.fromDate(transaction.date) });
            }
        } catch (error) { console.error("Erro ao adicionar transação:", error); }
    };

    const handleUpdateTransaction = async (updatedTransaction) => {
        if (!user || !updatedTransaction.id) return;
        try {
            const { id, ...dataToUpdate } = updatedTransaction;
            if (dataToUpdate.date instanceof Date) {
                dataToUpdate.date = Timestamp.fromDate(dataToUpdate.date);
            }
            await updateDoc(doc(db, 'transactions', id), dataToUpdate);
            setIsEditTransactionModalOpen(false);
            setEditingTransaction(null);
        } catch (error) { console.error("Erro ao atualizar transação:", error); }
    };

    const handleAddCategory = async (category) => {
        if (!user) return;
        const existingCategory = categories.find(cat => cat.name.toLowerCase() === category.name.toLowerCase());
        if (existingCategory) { alert("Já existe uma categoria com este nome."); return; }
        try { await addDoc(collection(db, 'categories'), { ...category, userId: user.uid }); }
        catch (error) { console.error("Erro ao adicionar categoria:", error); }
    };

    const handleUpdateCategory = async (updatedCategory) => {
        if (!user || !updatedCategory.id) return;
        const existingCategory = categories.find(cat => cat.name.toLowerCase() === updatedCategory.name.toLowerCase() && cat.id !== updatedCategory.id);
        if (existingCategory) { alert("Já existe outra categoria com este nome."); return; }
        const oldCategory = categories.find(cat => cat.id === updatedCategory.id);
        const oldCategoryName = oldCategory ? oldCategory.name : null;
        const newCategoryName = updatedCategory.name.trim();

        if (!oldCategoryName || oldCategoryName === newCategoryName) {
            try { await updateDoc(doc(db, 'categories', updatedCategory.id), { color: updatedCategory.color }); }
            catch(error) { console.error("Erro ao atualizar a cor da categoria:", error); }
            setIsEditCategoryModalOpen(false); setEditingCategory(null); return;
        }

        try {
            const batch = writeBatch(db);
            const categoryRef = doc(db, 'categories', updatedCategory.id);
            batch.update(categoryRef, { name: newCategoryName, color: updatedCategory.color });

            const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('category', '==', oldCategoryName));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((document) => { batch.update(doc(db, 'transactions', document.id), { category: newCategoryName }); });

            await batch.commit();
            setIsEditCategoryModalOpen(false); setEditingCategory(null);
        } catch (error) { console.error("Erro ao atualizar categoria e transações:", error); alert("Ocorreu um erro ao atualizar."); }
    };
    
    const handleTogglePaidStatus = async (transaction) => {
        if (!user || !transaction.id) return;
        try { await updateDoc(doc(db, 'transactions', transaction.id), { isPaid: !transaction.isPaid }); }
        catch (error) { console.error("Erro ao atualizar status de pagamento:", error); }
    };

    const handleDeleteRequest = (id, type) => setDeleteModalState({ isOpen: true, id, type });
    const handleConfirmDelete = async () => {
        const { id, type } = deleteModalState;
        if (!id || !type) return;
        const collectionName = type === 'transaction' ? 'transactions' : 'categories';
        const stateSetter = type === 'transaction' ? setTransactions : setCategories;
        const originalState = type === 'transaction' ? [...transactions] : [...categories];

        setDeleteModalState({ isOpen: false, id: null, type: null });
        stateSetter(prev => prev.filter(item => item.id !== id));

        try { await deleteDoc(doc(db, collectionName, id)); }
        catch (error) {
            console.error(`Erro ao deletar ${type}:`, error);
            stateSetter(originalState);
            alert(`Não foi possível excluir o item. Tente novamente.`);
        }
    };
    
    const handleFilterClick = (filterType) => {
        setListFilter(currentFilter => (currentFilter === filterType ? 'all' : filterType));
    };

    const handleSignOut = () => signOut(auth);

    const openEditTransactionModal = (transaction) => { setEditingTransaction(transaction); setIsEditTransactionModalOpen(true); };
    const openEditCategoryModal = (category) => { setEditingCategory(category); setIsEditCategoryModalOpen(true); };

    // --- Cálculos e Memos ---
    const {
        filteredTransactions,
        incomeTotal,
        expensePaid,
        expenseToPay,
        balance,
        expenseChartData,
        incomeChartData,
    } = useMemo(() => {
        const filtered = transactions.filter(t => new Date(t.date).getMonth() === currentMonth.getMonth() && new Date(t.date).getFullYear() === currentMonth.getFullYear());
        const income = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const paidExpense = filtered.filter(t => t.type === 'expense' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
        const toPayExpense = filtered.filter(t => t.type === 'expense' && !t.isPaid).reduce((acc, t) => acc + t.amount, 0);
        const expenseData = generateChartData(filtered, 'expense', categories);
        const incomeData = generateChartData(filtered, 'income', categories);
        return {
            filteredTransactions: filtered,
            incomeTotal: income, expensePaid: paidExpense, expenseToPay: toPayExpense,
            balance: income - paidExpense,
            expenseChartData: expenseData, incomeChartData: incomeData,
        };
    }, [transactions, currentMonth, categories]);
    
    const transactionsForDisplay = useMemo(() => {
        switch (listFilter) {
            case 'income': return filteredTransactions.filter(t => t.type === 'income');
            case 'paidExpense': return filteredTransactions.filter(t => t.type === 'expense' && t.isPaid);
            case 'toPayExpense': return filteredTransactions.filter(t => t.type === 'expense' && !t.isPaid);
            default: return filteredTransactions;
        }
    }, [listFilter, filteredTransactions]);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2rem', color: '#6c757d' }}>Carregando dados...</div>;

    const chartData = formType === 'expense' ? expenseChartData : incomeChartData;

    return (
        <>
            <ConfirmationModal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState({ isOpen: false, id: null, type: null })} onConfirm={handleConfirmDelete} message="Esta ação é permanente. Deseja realmente excluir este item?" />
            <EditTransactionModal isOpen={isEditTransactionModalOpen} onClose={() => { setIsEditTransactionModalOpen(false); setEditingTransaction(null); }} transaction={editingTransaction} categories={categories} onSave={handleUpdateTransaction} />
            <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => { setIsEditCategoryModalOpen(false); setEditingCategory(null); }} category={editingCategory} onSave={handleUpdateCategory} />

            <div className="dashboard-container">
                <header>
                    <h1>Meu Dashboard</h1>
                    <div className="header-controls">
                        <MonthNavigator currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
                        <button onClick={handleSignOut} className="signout-button">Sair</button>
                    </div>
                </header>
                <main>
                    <div className="summary-grid">
                        <SummaryCard title="Ganhos do Mês" value={incomeTotal} type="income" onClick={() => handleFilterClick('income')} isActive={listFilter === 'income'} />
                        <SummaryCard title="Despesas Pagas" value={expensePaid} type="expense" onClick={() => handleFilterClick('paidExpense')} isActive={listFilter === 'paidExpense'} />
                        <SummaryCard title="Despesas a Pagar" value={expenseToPay} type="expense" onClick={() => handleFilterClick('toPayExpense')} isActive={listFilter === 'toPayExpense'} />
                        <SummaryCard title="Saldo (Ganhos - Pagos)" value={balance} type="balance" />
                    </div>
                    <div className="main-layout">
                        <div className="sidebar">
                            <TransactionForm categories={categories} onAddTransaction={handleAddTransaction} type={formType} setType={setFormType} />
                            <CategoryManager categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={(id) => handleDeleteRequest(id, 'category')} onEditCategory={openEditCategoryModal} />
                        </div>
                        <div className="content">
                            <div className="charts-container">
                                <h3>{formType === 'expense' ? 'Gastos' : 'Ganhos'} por Categoria</h3>
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => { const p = (percent * 100).toFixed(0); return p < 5 ? null : `${name} ${p}%`; }}>
                                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <p className="empty-message">Nenhum(a) {formType === 'expense' ? 'gasto' : 'ganho'} registrado neste mês para exibir no gráfico.</p>}
                            </div>
                            <TransactionList transactions={transactionsForDisplay} categories={categories} onDeleteTransaction={(id) => handleDeleteRequest(id, 'transaction')} onEditTransaction={openEditTransactionModal} onTogglePaid={handleTogglePaidStatus} />
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default Dashboard;

