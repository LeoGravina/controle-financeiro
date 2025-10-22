/*
  VERIFICAÇÃO DE ESTRUTURA DE PASTAS:
  - Este arquivo (Dashboard.jsx) deve estar em: /src/pages/
  - Componentes (SummaryCard, etc.) em: /src/components/
  - Firebase config em: /src/firebase/
*/
import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FaThumbtack } from 'react-icons/fa';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase/config'; // Caminho SEM extensão

// Importando todos os componentes (SEM extensões)
import SummaryCard from '../components/SummaryCard';
import MonthNavigator from '../components/MonthNavigator';
import CategoryManager from '../components/CategoryManager';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import ConfirmationModal from '../components/ConfirmationModal';
import EditTransactionModal from '../components/EditTransactionModal';
import EditCategoryModal from '../components/EditCategoryModal';
import FixedExpensesManager from '../components/FixedExpensesManager';
import EditFixedExpenseModal from '../components/EditFixedExpenseModal'; // <<< Modal de Edição Gasto Fixo

// Componente para o Tooltip Personalizado
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        const percent = (data.payload.percent * 100);
        return (
            <div className="custom-tooltip">
                <p className="label">{`${data.name}`}</p>
                <p className="value">{`Valor: ${data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
                {typeof percent === 'number' && !isNaN(percent) && (
                    <p className="percent">{`Percentual: ${percent.toFixed(1)}%`}</p>
                )}
            </div>
        );
    }
    return null;
};

// Função para gerar dados do gráfico
const generateChartData = (transactions, type, categories) => {
    const filtered = transactions.filter(t => t.type === type);
    const total = filtered.reduce((acc, t) => acc + t.amount, 0);
    if (total === 0) return [];
    const grouped = filtered.reduce((acc, t) => {
        const categoryName = t.category || 'Outros';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => {
        const category = categories.find(cat => cat.name === name);
        return { name, value, percent: value / total, color: category ? category.color : '#bdc3c7' };
    });
};

const Dashboard = () => {
    // Estados
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [fixedExpenses, setFixedExpenses] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [listFilter, setListFilter] = useState('all');
    const [formType, setFormType] = useState('expense');
    const [transactionViewTab, setTransactionViewTab] = useState('monthly'); // Aba da lista
    const [sidebarTab, setSidebarTab] = useState('transaction'); // Aba da sidebar
    // Estados dos Modais
    const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, id: null, type: null });
    const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isEditFixedExpenseModalOpen, setIsEditFixedExpenseModalOpen] = useState(false); // <<< NOVO ESTADO
    const [editingFixedExpense, setEditingFixedExpense] = useState(null); // <<< NOVO ESTADO

    // Efeito de Autenticação
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, currentUser => setUser(currentUser || null));
        return () => unsubAuth();
    }, []);

    // Efeito para buscar todos os dados do Firestore
    useEffect(() => {
        if (!user) {
            setTransactions([]); setCategories([]); setFixedExpenses([]); setLoading(false); return;
        }
        setLoading(true);
        let listenersActive = true;
        const unsubCategories = onSnapshot(query(collection(db, 'categories'), where('userId', '==', user.uid)), (snap) => { if (listenersActive) setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))) }, err => { console.error("Erro Cat:", err); if (listenersActive) setLoading(false); });
        const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), where('userId', '==', user.uid)), (snap) => {
            if (listenersActive) {
                setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })));
                setLoading(false); // Loading termina após transações
            }
        }, err => { console.error("Erro Trans:", err); if (listenersActive) setLoading(false); });
        const unsubFixedExpenses = onSnapshot(query(collection(db, 'fixedExpenses'), where('userId', '==', user.uid)), (snap) => { if (listenersActive) setFixedExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))) }, err => console.error("Erro Fixed:", err));
        return () => { listenersActive = false; unsubCategories(); unsubTransactions(); unsubFixedExpenses(); };
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
                    const installmentDate = new Date(transaction.date); installmentDate.setMonth(installmentDate.getMonth() + i);
                    if (installmentDate.getDate() !== transaction.date.getDate()) installmentDate.setDate(0);
                    const newTransactionRef = doc(collection(db, 'transactions'));
                    batch.set(newTransactionRef, { ...rest, userId: user.uid, amount: installmentAmount, description: `${transaction.description} (${i + 1}/${installments})`, date: Timestamp.fromDate(installmentDate), isPaid: false });
                }
                await batch.commit();
            } else {
                await addDoc(collection(db, 'transactions'), { ...rest, userId: user.uid, date: Timestamp.fromDate(transaction.date), isPaid: transaction.isPaid ?? false });
            }
        } catch (error) { console.error("Erro Adicionar Transação:", error); }
    };
    const handleUpdateTransaction = async (updatedTransaction) => {
        if (!user || !updatedTransaction.id) return;
        try {
            const { id, ...dataToUpdate } = updatedTransaction;
            if (dataToUpdate.date instanceof Date) dataToUpdate.date = Timestamp.fromDate(dataToUpdate.date);
            await updateDoc(doc(db, 'transactions', id), dataToUpdate);
            setIsEditTransactionModalOpen(false); setEditingTransaction(null);
        } catch (error) { console.error("Erro Atualizar Transação:", error); }
    };
    const handleAddCategory = async (category) => {
        if (!user) return;
        const existing = categories.find(c => c.name.toLowerCase() === category.name.toLowerCase());
        if (existing) { alert("Categoria já existe."); return; }
        try { await addDoc(collection(db, 'categories'), { ...category, userId: user.uid }); }
        catch (error) { console.error("Erro Adicionar Categoria:", error); }
    };
    const handleUpdateCategory = async (updatedCategory) => {
        if (!user || !updatedCategory.id) return;
        const existing = categories.find(c => c.name.toLowerCase() === updatedCategory.name.toLowerCase() && c.id !== updatedCategory.id);
        if (existing) { alert("Já existe outra categoria com este nome."); return; }
        const oldCategory = categories.find(c => c.id === updatedCategory.id);
        const oldName = oldCategory ? oldCategory.name : null;
        const newName = updatedCategory.name.trim();
        if (!oldName || oldName === newName) { // Apenas atualiza cor
            try { await updateDoc(doc(db, 'categories', updatedCategory.id), { color: updatedCategory.color }); }
            catch (error) { console.error("Erro Atualizar Cor Categoria:", error); }
            setIsEditCategoryModalOpen(false); setEditingCategory(null); return;
        }
        // Atualiza nome, cor e propaga
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'categories', updatedCategory.id), { name: newName, color: updatedCategory.color });
            const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('category', '==', oldName));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((document) => batch.update(doc(db, 'transactions', document.id), { category: newName }));
            await batch.commit();
            setIsEditCategoryModalOpen(false); setEditingCategory(null);
        } catch (error) { console.error("Erro Atualizar Categoria & Transações:", error); alert("Erro ao atualizar."); }
    };
    const handleTogglePaidStatus = async (transaction) => {
        if (transaction.isFixed && !transaction.isPaid) { // Pagar Gasto Fixo (cria transação real)
            const realTransaction = { ...transaction };
            delete realTransaction.id; delete realTransaction.isFixed;
            realTransaction.isPaid = true;
            await handleAddTransaction(realTransaction);
        } else if (!transaction.isFixed && transaction.id) { // Toggle transação normal
            try { await updateDoc(doc(db, 'transactions', transaction.id), { isPaid: !transaction.isPaid }); }
            catch (error) { console.error("Erro Toggle Pago:", error); }
        }
     };
    const handleDeleteRequest = (id, type) => {
        if (type === 'transaction' && id.startsWith('fixed-')) { alert("Gastos fixos só podem ser removidos na seção 'Gastos Fixos'."); return; }
        // Se for fixedExpense, chama a função específica de deletar gasto fixo no modal
        if (type === 'fixedExpense') {
            handleDeleteFixedExpense(id); // Ajustado para chamar a função que abre o modal
        } else {
            setDeleteModalState({ isOpen: true, id, type });
        }
    };
    const handleConfirmDelete = async () => {
        const { id, type } = deleteModalState;
        if (!id || !type || type === 'fixedExpense') return; // Gasto Fixo é tratado separadamente
        const collectionName = type === 'transaction' ? 'transactions' : 'categories';
        const stateSetter = type === 'transaction' ? setTransactions : setCategories;
        const originalState = type === 'transaction' ? [...transactions] : [...categories];
        setDeleteModalState({ isOpen: false, id: null, type: null });
        stateSetter(prev => prev.filter(item => item.id !== id)); // Otimista
        try { await deleteDoc(doc(db, collectionName, id)); }
        catch (error) { console.error(`Erro Deletar ${type}:`, error); stateSetter(originalState); alert(`Erro ao excluir.`); }
    };
    const handleAddFixedExpense = async (expense) => {
        if (!user) return;
        try { await addDoc(collection(db, 'fixedExpenses'), { ...expense, userId: user.uid }); }
        catch (error) { console.error("Erro Adicionar Gasto Fixo:", error); }
    };
    const handleDeleteFixedExpense = (id) => { // Abre o modal de confirmação para Gasto Fixo
        if (!user) return;
        setDeleteModalState({ isOpen: true, id: id, type: 'fixedExpense' });
    };
    // Função separada para confirmar delete de Gasto Fixo
    const handleConfirmDeleteFixedExpense = async () => {
         const { id } = deleteModalState;
         if (!id || deleteModalState.type !== 'fixedExpense') return;
         const originalState = [...fixedExpenses];
         setDeleteModalState({ isOpen: false, id: null, type: null }); // Fecha modal
         setFixedExpenses(prev => prev.filter(item => item.id !== id)); // Otimista
         try { await deleteDoc(doc(db, 'fixedExpenses', id)); } // Tenta deletar no DB
         catch(error) { console.error("Erro Deletar Gasto Fixo:", error); setFixedExpenses(originalState); alert("Erro ao excluir gasto fixo."); }
    };
    // << NOVA: Função para Atualizar Gasto Fixo >>
    const handleUpdateFixedExpense = async (updatedExpense) => {
        if (!user || !updatedExpense.id) return;
        try {
            const { id, ...dataToUpdate } = updatedExpense;
            await updateDoc(doc(db, 'fixedExpenses', id), dataToUpdate);
            setIsEditFixedExpenseModalOpen(false); // Fecha o modal
            setEditingFixedExpense(null);
        } catch (error) { console.error("Erro Atualizar Gasto Fixo:", error); alert("Não foi possível atualizar."); }
    };
    const handleSignOut = () => signOut(auth);
    const openEditTransactionModal = (transaction) => { setEditingTransaction(transaction); setIsEditTransactionModalOpen(true); };
    const openEditCategoryModal = (category) => { setEditingCategory(category); setIsEditCategoryModalOpen(true); };
    // << NOVA: Função para Abrir Modal de Edição de Gasto Fixo >>
    const openEditFixedExpenseModal = (expense) => { setEditingFixedExpense(expense); setIsEditFixedExpenseModalOpen(true); };
    const handleFilterClick = (filterType) => setListFilter(current => (current === filterType ? 'all' : filterType));

    // --- LÓGICA PRINCIPAL E CÁLCULOS ---
    const allTransactionsForMonth = useMemo(() => {
        let monthTransactions = transactions.filter(t => new Date(t.date).getMonth() === currentMonth.getMonth() && new Date(t.date).getFullYear() === currentMonth.getFullYear());
        fixedExpenses.forEach(fixed => {
            const paidVersionExists = monthTransactions.some(t => !t.isFixed && t.isPaid && t.description.toLowerCase().includes(fixed.description.toLowerCase()) && new Date(t.date).getDate() === fixed.dayOfMonth);
            if (!paidVersionExists) {
                monthTransactions.push({
                    id: `fixed-${fixed.id}-${currentMonth.getFullYear()}-${currentMonth.getMonth()}`,
                    description: fixed.description, amount: fixed.amount,
                    date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), fixed.dayOfMonth),
                    type: 'expense', category: fixed.category, isPaid: false, isFixed: true,
                });
            }
        });
        return monthTransactions;
    }, [transactions, fixedExpenses, currentMonth]);

    const { incomeTotal, expensePaid, expenseToPay, balance } = useMemo(() => {
        let income = 0, paidExpense = 0, toPayExpense = 0;
        allTransactionsForMonth.forEach(t => { (t.type === 'income') ? income += t.amount : (t.isPaid ? paidExpense += t.amount : toPayExpense += t.amount); });
        return { incomeTotal: income, expensePaid: paidExpense, expenseToPay: toPayExpense, balance: income - paidExpense };
    }, [allTransactionsForMonth]);

    const expenseChartData = useMemo(() => generateChartData(allTransactionsForMonth, 'expense', categories), [allTransactionsForMonth, categories]);
    const incomeChartData = useMemo(() => generateChartData(allTransactionsForMonth, 'income', categories), [allTransactionsForMonth, categories]);

    const transactionsForDisplay = useMemo(() => {
        let baseList;
        if (transactionViewTab === 'fixed') {
             baseList = allTransactionsForMonth.filter(t => t.isFixed);
             // Aplica filtros PAGO/NAO PAGO se ativos na aba GASTOS FIXOS
             if (listFilter === 'paidExpense') return baseList.filter(t => t.isPaid);
             if (listFilter === 'toPayExpense') return baseList.filter(t => !t.isPaid);
             // Ignora filtro 'income' para gastos fixos, mostra todos
             return baseList;
        } else { // Aba 'monthly'
             baseList = allTransactionsForMonth.filter(t => !t.isFixed || (t.isFixed && t.isPaid)); // Manuais + Fixos pagos
            switch (listFilter) {
                case 'income': return baseList.filter(t => t.type === 'income');
                case 'paidExpense': return baseList.filter(t => t.type === 'expense' && t.isPaid);
                case 'toPayExpense': return baseList.filter(t => t.type === 'expense' && !t.isPaid); // Mostra não pagos manuais
                default: return baseList; // 'all'
            }
        }
    }, [listFilter, transactionViewTab, allTransactionsForMonth]);

    if (loading) return <div>Carregando...</div>;

    return (
        <>
            {/* Seção de Modais (adicionado EditFixedExpenseModal) */}
            <ConfirmationModal
                isOpen={deleteModalState.isOpen}
                onClose={() => setDeleteModalState({ isOpen: false, id: null, type: null })}
                onConfirm={deleteModalState.type === 'fixedExpense' ? handleConfirmDeleteFixedExpense : handleConfirmDelete} // Chama a função correta
                message="Esta ação é permanente. Deseja realmente excluir este item?"
            />
            <EditTransactionModal isOpen={isEditTransactionModalOpen} onClose={() => { setIsEditTransactionModalOpen(false); setEditingTransaction(null); }} transaction={editingTransaction} categories={categories} onSave={handleUpdateTransaction} />
            <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => { setIsEditCategoryModalOpen(false); setEditingCategory(null); }} category={editingCategory} onSave={handleUpdateCategory} />
            {/* <<< NOVO MODAL DE EDIÇÃO GASTO FIXO >>> */}
            <EditFixedExpenseModal isOpen={isEditFixedExpenseModalOpen} onClose={() => { setIsEditFixedExpenseModalOpen(false); setEditingFixedExpense(null); }} expense={editingFixedExpense} categories={categories} onSave={handleUpdateFixedExpense} />


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
                            {/* === Abas da Sidebar === */}
                            <div className="sidebar-tabs">
                                <button className={`sidebar-tab-button ${sidebarTab === 'transaction' ? 'active' : ''}`} onClick={() => setSidebarTab('transaction')}> Adicionar Transação </button>
                                <button className={`sidebar-tab-button ${sidebarTab === 'fixed' ? 'active' : ''}`} onClick={() => setSidebarTab('fixed')}> Gastos Fixos </button>
                            </div>
                            
                            {/* Container para conteúdo abaixo das abas */}
                            <div className="sidebar-content-container">
                                {sidebarTab === 'transaction' && (
                                    <TransactionForm categories={categories} onAddTransaction={handleAddTransaction} type={formType} setType={setFormType} />
                                )}
                                {sidebarTab === 'fixed' && (
                                    // Passa a função para abrir o modal de edição
                                    <FixedExpensesManager categories={categories} onAddFixedExpense={handleAddFixedExpense} fixedExpenses={fixedExpenses} onDeleteFixedExpense={handleDeleteFixedExpense} onEditFixedExpense={openEditFixedExpenseModal} />
                                )}
                            </div>

                            <CategoryManager categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={(id) => handleDeleteRequest(id, 'category')} onEditCategory={openEditCategoryModal} />
                        </div>
                        <div className="content">
                            {/* Gráficos Lado a Lado com Destaque */}
                            <div className="charts-grid">
                                <div className={`chart-item ${formType === 'income' ? 'highlighted' : ''}`}>
                                    <h4>Ganhos por Categoria</h4>
                                    {incomeChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie data={incomeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                                    {incomeChartData.map((entry) => <Cell key={`cell-income-${entry.name}`} fill={entry.color} />)}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="empty-message">Nenhum ganho neste mês.</p>}
                                </div>
                                <div className={`chart-item ${formType === 'expense' ? 'highlighted' : ''}`}>
                                    <h4>Gastos por Categoria</h4>
                                    {expenseChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                                    {expenseChartData.map((entry) => <Cell key={`cell-expense-${entry.name}`} fill={entry.color} />)}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="empty-message">Nenhum gasto neste mês.</p>}
                                </div>
                            </div>

                            {/* Seletor de Abas para a Lista */}
                            <div className="transaction-view-tabs">
                                <button className={`tab-button ${transactionViewTab === 'monthly' ? 'active' : ''}`} onClick={() => setTransactionViewTab('monthly')}> Transações do Mês </button>
                                <button className={`tab-button ${transactionViewTab === 'fixed' ? 'active' : ''}`} onClick={() => setTransactionViewTab('fixed')}> Gastos Fixos Previstos </button>
                            </div>

                            {/* Lista de Transações */}
                            <TransactionList transactions={transactionsForDisplay} categories={categories} onDeleteTransaction={(id, type) => handleDeleteRequest(id, type)} onEditTransaction={openEditTransactionModal} onTogglePaid={handleTogglePaidStatus} />
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default Dashboard;