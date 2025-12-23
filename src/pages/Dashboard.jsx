// src/pages/Dashboard.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch, increment, Timestamp } from 'firebase/firestore'; 
import Select from 'react-select'; 

// HOOKS E CONTEXTOS
import { useTransactions } from '../hooks/useTransactions'; 
import { useFinance } from '../contexts/FinanceContext'; // Contexto Global

// COMPONENTES
import SummaryCard from '../components/SummaryCard';
import MonthNavigator from '../components/MonthNavigator';
import CategoryManager from '../components/CategoryManager';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import ConfirmationModal from '../components/ConfirmationModal';
import EditTransactionModal from '../components/EditTransactionModal';
import EditCategoryModal from '../components/EditCategoryModal';
import FixedExpensesManager from '../components/FixedExpensesManager';
import EditFixedExpenseModal from '../components/EditFixedExpenseModal';
import BudgetManager from '../components/BudgetManager'; 
import BudgetProgressList from '../components/BudgetProgressList'; 
import GoalManager from '../components/GoalManager'; 
import GoalProgressList from '../components/GoalProgressList'; 
import AddFundsToGoalModal from '../components/AddFundsToGoalModal'; 
import ActionModal from '../components/ActionModal'; 
import WithdrawFromGoalModal from '../components/WithdrawFromGoalModal'; 

// TOOLTIP CHART
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        const percent = (data.payload.percent * 100);
        return (
            <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <p className="label" style={{ margin: '0 0 5px 0', fontWeight: '700', color: '#333', fontSize: '1rem' }}>{`${data.name}`}</p>
                <p className="value" style={{ margin: 0, color: '#6a82fb', fontWeight: '600', fontSize: '0.95rem' }}>{`Valor: ${data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
                {typeof percent === 'number' && !isNaN(percent) && (
                    <p className="percent" style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.85rem' }}>{`Representatividade: ${percent.toFixed(1)}%`}</p>
                )}
            </div>
        );
    }
    return null;
};

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

const typeFilterOptions = [
    { value: 'all', label: 'Tipo (Todos)' },
    { value: 'income', label: 'Recebimentos' },
    { value: 'paidExpense', label: 'Desp. Pagas' },
    { value: 'toPayExpense', label: 'Desp. a Pagar' }
];

// MODAL MOBILE
const MobileModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content mobile-modal-content" onClick={e => e.stopPropagation()}>
                <div className="form-container-header">
                    <h3>{title}</h3>
                    <button onClick={onClose} className="action-button">✖</button>
                </div>
                {children}
            </div>
        </div>
    );
};

const Dashboard = () => {
    // 1. Dados Globais do Contexto (Adicionado updateCategory e deleteCategory)
    const { 
        user, 
        categories, 
        addCategory, // Novo
        updateCategory, // Novo
        deleteCategory, // Novo
        removeTransaction, 
        editTransaction, 
        togglePaid 
    } = useFinance();
    
    // 2. Estados Locais
    const [fixedExpenses, setFixedExpenses] = useState([]);
    const [budgets, setBudgets] = useState([]); 
    const [goals, setGoals] = useState([]); 
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loadingOtherData, setLoadingOtherData] = useState(true); 

    const { transactions, loading: loadingTransactions } = useTransactions(user, currentMonth);

    const [formType, setFormType] = useState('expense');
    const [transactionViewTab, setTransactionViewTab] = useState('monthly');
    const [sidebarTab, setSidebarTab] = useState('transaction'); 
    const [descriptionFilter, setDescriptionFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState(null); 
    const [typeFilter, setTypeFilter] = useState(typeFilterOptions[0]); 
    const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, id: null, type: null, transactionData: null });
    
    const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isEditFixedExpenseModalOpen, setIsEditFixedExpenseModalOpen] = useState(false);
    const [editingFixedExpense, setEditingFixedExpense] = useState(null);
    const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false); 
    const [selectedGoal, setSelectedGoal] = useState(null); 
    const [paymentActionModal, setPaymentActionModal] = useState({ isOpen: false, transaction: null });

    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [mobileView, setMobileView] = useState(null); 

    const navigate = useNavigate();
    const transactionListRef = useRef(null);

    // Carregar dados secundários
    useEffect(() => {
        if (!user) {
            setFixedExpenses([]); setBudgets([]); setGoals([]); 
            setLoadingOtherData(false); 
            return;
        }
        setLoadingOtherData(true); 
        let listenersActive = true;
        
        const unsubFixedExpenses = onSnapshot(query(collection(db, 'fixedExpenses'), where('userId', '==', user.uid)), (snap) => { 
            if (listenersActive) setFixedExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        
        const month = currentMonth.getMonth();
        const year = currentMonth.getFullYear();
        const budgetQuery = query(collection(db, 'budgets'), where('userId', '==', user.uid), where('month', '==', month), where('year', '==', year) );
        const unsubBudgets = onSnapshot(budgetQuery, (snap) => {
             if (listenersActive) setBudgets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); 
        });

        const goalsQuery = query(collection(db, 'goals'), where('userId', '==', user.uid));
        const unsubGoals = onSnapshot(goalsQuery, (snap) => {
            if (listenersActive) {
                const fetchedGoals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedGoals.sort((a, b) => a.goalName.localeCompare(b.goalName)); 
                setGoals(fetchedGoals);
                setLoadingOtherData(false); 
            }
        });

        return () => { 
            listenersActive = false; 
            unsubFixedExpenses(); unsubBudgets(); unsubGoals(); 
        };
    }, [user, currentMonth]);

    useEffect(() => {
        const listElement = transactionListRef.current?.querySelector('ul');
        if (listElement) { listElement.scrollTop = 0; }
    }, [descriptionFilter, categoryFilter, typeFilter, transactionViewTab]);

    // --- ACTIONS ---

    const openMobileView = (viewName) => { setMobileView(viewName); setIsFabMenuOpen(false); };
    const openEditTransactionModal = (transaction) => { setMobileView(null); setEditingTransaction(transaction); setIsEditTransactionModalOpen(true); };
    const openEditCategoryModal = (category) => { setMobileView(null); setEditingCategory(category); setIsEditCategoryModalOpen(true); };
    const openEditFixedExpenseModal = (expense) => { setMobileView(null); setEditingFixedExpense(expense); setIsEditFixedExpenseModalOpen(true); };
    const openAddFundsModal = (goal) => { setMobileView(null); setSelectedGoal(goal); setIsAddFundsModalOpen(true); };
    const openWithdrawModal = (goal) => { setMobileView(null); setSelectedGoal(goal); setIsWithdrawModalOpen(true); };

    const handleDeleteRequest = (id, type) => {
        setMobileView(null); 
        if (type === 'transaction' && id.startsWith('fixed-')) { alert("Despesas fixas só podem ser removidas na seção 'Despesas Fixas'."); return; } 
        if (type === 'fixedExpense') { handleDeleteFixedExpense(id); return; } 
        // Se for categoria, vamos usar o modal de edição para excluir, ou deletar direto aqui se vier da lista
        if (type === 'category') {
             // Deixa o modal de confirmação genérico cuidar ou usa o context direto
             // Nesse caso, vamos deixar o ConfirmationModal cuidar
        }
        
        let transactionData = null;
        if (type === 'transaction') { transactionData = transactions.find(t => t.id === id) || null; }
        
        setDeleteModalState({ isOpen: true, id, type, transactionData });
    };

    const handleConfirmDelete = async () => {
        const { id, type, transactionData } = deleteModalState; 
        if (!id || !type) return;
        setDeleteModalState({ isOpen: false, id: null, type: null, transactionData: null }); 
        
        if (type === 'category') {
            await deleteCategory(id); // Usa a função do Contexto com Toast
        } else if (type === 'transaction') {
            await removeTransaction(id, transactionData);
        }
    };
    
    // Atualização de Transação via Modal
    const handleUpdateTransaction = async (updatedTransaction) => {
        await editTransaction(updatedTransaction);
        setIsEditTransactionModalOpen(false); 
        setEditingTransaction(null);
    };

    // Toggle Pago
    const handleTogglePaidStatus = async (transaction) => {
        if (transaction.installmentGroupId && !transaction.isPaid) { 
            setPaymentActionModal({ isOpen: true, transaction: transaction }); 
            return; 
        }
        if (transaction.isFixed && !transaction.isPaid) { 
            const { id, isFixed, ...realTransaction } = transaction; 
            realTransaction.isPaid = true; 
            try {
                await addDoc(collection(db, 'transactions'), {
                    ...realTransaction,
                    userId: user.uid,
                    date: Timestamp.fromDate(transaction.date), 
                    createdAt: Timestamp.now()
                });
            } catch (e) { console.error(e); }
        } else if (!transaction.isFixed && transaction.id) { 
            await togglePaid(transaction);
        }
    };

    const handlePaymentAction = async (actionType, transaction) => {
        setPaymentActionModal({ isOpen: false, transaction: null });
        if (!transaction || !transaction.id || !user) return;

        if (actionType === 'single') { 
            await togglePaid(transaction);
        } else if (actionType === 'all') {
            const batch = writeBatch(db);
            const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('installmentGroupId', '==', transaction.installmentGroupId));
            const querySnapshot = await import('firebase/firestore').then(mod => mod.getDocs(q));
            querySnapshot.forEach(doc => { if (!doc.data().isPaid) batch.update(doc.ref, { isPaid: true }); });
            await batch.commit();
        }
    };

    // --- CATEGORIAS (Agora usando Contexto) ---
    const handleAddCategory = async (category) => {
        await addCategory(category); // Contexto cuida do Toast
        setMobileView(null);
    };
    
    const handleUpdateCategory = async (updatedCategory) => {
        await updateCategory(updatedCategory); // Contexto cuida do Toast e lógica pesada
        setIsEditCategoryModalOpen(false);
        setEditingCategory(null);
    };

    // --- OUTROS (FIXOS, METAS) - Mantidos Locais por enquanto ---
    const handleAddFixedExpense = async (expense) => { if (!user) return; try { await addDoc(collection(db, 'fixedExpenses'), { ...expense, userId: user.uid }); } catch (error) { console.error(error); } };
    const handleDeleteFixedExpense = (id) => { if (!user) return; setDeleteModalState({ isOpen: true, id: id, type: 'fixedExpense' }); };
    const handleConfirmDeleteFixedExpense = async () => { const { id } = deleteModalState; if (!id) return; setDeleteModalState({ isOpen: false, id: null, type: null }); try { await deleteDoc(doc(db, 'fixedExpenses', id)); } catch(error) { console.error(error); } };
    const handleUpdateFixedExpense = async (updatedExpense) => { if (!user || !updatedExpense.id) return; try { const { id, ...dataToUpdate } = updatedExpense; await updateDoc(doc(db, 'fixedExpenses', id), dataToUpdate); setIsEditFixedExpenseModalOpen(false); setEditingFixedExpense(null); } catch (error) { console.error(error); } };
    
    const closeAddFundsModal = () => { setSelectedGoal(null); setIsAddFundsModalOpen(false); };
    const handleAddFundsToGoal = async (goal, amount, paymentMethod) => {
        if (!user || !goal) return;
        const metaCategory = categories.find(c => c.name.toLowerCase() === 'metas');
        const batch = writeBatch(db);
        batch.update(doc(db, 'goals', goal.id), { currentAmount: increment(amount) });
        const newTransactionRef = doc(collection(db, 'transactions'));
        batch.set(newTransactionRef, { userId: user.uid, description: `Contribuição para Meta: ${goal.goalName}`, amount: amount, date: Timestamp.now(), type: 'expense', category: metaCategory ? metaCategory.name : 'Outros', paymentMethod: paymentMethod, isPaid: true, isInstallment: false, installments: 1 });
        await batch.commit();
    };

    const closeWithdrawModal = () => { setSelectedGoal(null); setIsWithdrawModalOpen(false); };
    const handleWithdrawFromGoal = async (goal, amount, paymentMethod) => {
        if (!user || !goal) return;
        const metaCategory = categories.find(c => c.name.toLowerCase() === 'metas');
        const batch = writeBatch(db);
        batch.update(doc(db, 'goals', goal.id), { currentAmount: increment(-amount) });
        const newTransactionRef = doc(collection(db, 'transactions'));
        batch.set(newTransactionRef, { userId: user.uid, description: `Resgate da Meta: ${goal.goalName}`, amount: amount, date: Timestamp.now(), type: 'income', category: metaCategory ? metaCategory.name : 'Outros', paymentMethod: paymentMethod, isPaid: true, isInstallment: false, installments: 1 });
        await batch.commit();
    };

    // --- CÁLCULOS VISUAIS ---
    const allTransactionsForMonth = useMemo(() => {
        let monthTransactions = [...transactions]; 
        fixedExpenses.forEach(fixed => {
            const realVersionExists = monthTransactions.some(t => 
                !t.isFixed && 
                t.description.toLowerCase().includes(fixed.description.toLowerCase()) && 
                new Date(t.date).getDate() === fixed.dayOfMonth
            );
            if (!realVersionExists) {
                monthTransactions.push({
                    id: `fixed-${fixed.id}-${currentMonth.getFullYear()}-${currentMonth.getMonth()}`, 
                    description: fixed.description, amount: fixed.amount,
                    date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), fixed.dayOfMonth), 
                    type: 'expense', category: fixed.category, isPaid: false, isFixed: true,
                });
            }
        });
        return monthTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, fixedExpenses, currentMonth]);

    const { incomeTotal, expensePaid, expenseToPay, balance } = useMemo(() => {
        let income = 0, paidExpense = 0, toPayExpense = 0; 
        allTransactionsForMonth.forEach(t => { 
            (t.type === 'income') ? income += t.amount : (t.isPaid ? paidExpense += t.amount : toPayExpense += t.amount); 
        }); 
        return { incomeTotal: income, expensePaid: paidExpense, expenseToPay: toPayExpense, balance: income - paidExpense };
    }, [allTransactionsForMonth]);

    const expenseChartData = useMemo(() => generateChartData(allTransactionsForMonth, 'expense', categories), [allTransactionsForMonth, categories]);
    const incomeChartData = useMemo(() => generateChartData(allTransactionsForMonth, 'income', categories), [allTransactionsForMonth, categories]);

    const expensesByCategory = useMemo(() => {
        const monthlyExpenses = allTransactionsForMonth.filter(t => t.type === 'expense'); 
        return monthlyExpenses.reduce((acc, transaction) => { 
            const categoryName = transaction.category || 'Outros'; 
            acc[categoryName] = (acc[categoryName] || 0) + transaction.amount; 
            return acc; 
        }, {});
    }, [allTransactionsForMonth]);

    const transactionsForDisplay = useMemo(() => {
        let baseList; 
        if (transactionViewTab === 'fixed') { baseList = allTransactionsForMonth.filter(t => t.isFixed); } 
        else { baseList = allTransactionsForMonth.filter(t => !t.isFixed || (t.isFixed && t.isPaid)); } 
        let filteredByType = baseList; 
        switch (typeFilter.value) { 
            case 'income': filteredByType = baseList.filter(t => t.type === 'income'); break; 
            case 'paidExpense': filteredByType = baseList.filter(t => t.type === 'expense' && t.isPaid); break; 
            case 'toPayExpense': filteredByType = baseList.filter(t => t.type === 'expense' && !t.isPaid); break; 
        } 
        const descLower = descriptionFilter.toLowerCase(); 
        const selectedCategoryNames = categoryFilter ? categoryFilter.map(opt => opt.value.toLowerCase()) : []; 
        return filteredByType.filter(t => { 
            const descriptionMatch = t.description?.toLowerCase().includes(descLower) ?? true; 
            const categoryMatch = selectedCategoryNames.length === 0 || selectedCategoryNames.includes(t.category?.toLowerCase()); 
            return descriptionMatch && categoryMatch; 
        });
    }, [typeFilter, transactionViewTab, allTransactionsForMonth, descriptionFilter, categoryFilter]); 

    const categoryFilterOptions = useMemo(() => [ ...categories.map(cat => ({ value: cat.name, label: cat.name })).sort((a, b) => a.label.localeCompare(b.label)) ], [categories]);

    if (loadingOtherData || (user && loadingTransactions)) return <div style={{padding: '50px', textAlign: 'center'}}>Carregando dashboard...</div>; 

    return (
        <>
            <ConfirmationModal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState({ isOpen: false, id: null, type: null, transactionData: null })} onConfirm={deleteModalState.type === 'fixedExpense' ? handleConfirmDeleteFixedExpense : handleConfirmDelete} message="Esta ação é permanente..." />
            
            <EditTransactionModal isOpen={isEditTransactionModalOpen} onClose={() => { setIsEditTransactionModalOpen(false); setEditingTransaction(null); }} transaction={editingTransaction} categories={categories} onSave={handleUpdateTransaction} />
            
            {/* AGORA O MODAL RECEBE O DELETECATEGORY DIRETAMENTE */}
            <EditCategoryModal 
                isOpen={isEditCategoryModalOpen} 
                onClose={() => { setIsEditCategoryModalOpen(false); setEditingCategory(null); }} 
                category={editingCategory} 
                onSave={handleUpdateCategory} 
                onDelete={deleteCategory} 
            />
            
            <EditFixedExpenseModal isOpen={isEditFixedExpenseModalOpen} onClose={() => { setIsEditFixedExpenseModalOpen(false); setEditingFixedExpense(null); }} expense={editingFixedExpense} categories={categories} onSave={handleUpdateFixedExpense} />
            <AddFundsToGoalModal isOpen={isAddFundsModalOpen} onClose={closeAddFundsModal} goal={selectedGoal} categories={categories} onSave={handleAddFundsToGoal} />
            <WithdrawFromGoalModal isOpen={isWithdrawModalOpen} onClose={closeWithdrawModal} goal={selectedGoal} categories={categories} onSave={handleWithdrawFromGoal} />
            <ActionModal isOpen={paymentActionModal.isOpen} onClose={() => setPaymentActionModal({ isOpen: false, transaction: null })} title="Confirmar Pagamento" message={`Deseja pagar apenas esta parcela ou quitar todas?`} actions={[ { label: 'Apenas esta', onClick: () => handlePaymentAction('single', paymentActionModal.transaction), className: 'confirm', style: { backgroundColor: 'var(--primary-color)' } }, { label: 'Quitar Todas', onClick: () => handlePaymentAction('all', paymentActionModal.transaction), className: 'confirm', style: { backgroundColor: 'var(--income-color)' } }, { label: 'Cancelar', onClick: () => setPaymentActionModal({ isOpen: false, transaction: null }), className: 'cancel' } ]} />

            <MobileModal isOpen={!!mobileView} onClose={() => setMobileView(null)} title={mobileView === 'transaction' ? 'Adicionar Transação' : mobileView === 'category' ? 'Categorias' : mobileView === 'goals' ? 'Metas' : mobileView === 'fixed' ? 'Fixos' : mobileView === 'budget' ? 'Orçamentos' : mobileView === 'charts' ? 'Gráficos' : ''}>
                {mobileView === 'transaction' && ( <TransactionForm type={formType} setType={setFormType} /> )}
                {mobileView === 'category' && ( <CategoryManager categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={(id) => handleDeleteRequest(id, 'category')} onEditCategory={openEditCategoryModal} /> )}
                {mobileView === 'goals' && ( <GoalProgressList goals={goals} onAddFundsClick={openAddFundsModal} onWithdrawFundsClick={openWithdrawModal}/> )}
                {mobileView === 'fixed' && ( <FixedExpensesManager categories={categories} onAddFixedExpense={handleAddFixedExpense} fixedExpenses={fixedExpenses} onDeleteFixedExpense={handleDeleteFixedExpense} onEditFixedExpense={openEditFixedExpenseModal} /> )}
                {mobileView === 'budget' && ( <BudgetManager categories={categories} currentMonth={currentMonth} budgets={budgets} /> )}
                {mobileView === 'charts' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                         <div className="chart-item">
                            <h4>Recebimentos</h4>
                            <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={incomeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} isAnimationActive={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{incomeChartData.map((entry) => <Cell key={`cell-income-${entry.name}`} fill={entry.color} />)}</Pie><Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} /></PieChart></ResponsiveContainer>
                         </div>
                         <div className="chart-item">
                            <h4>Despesas</h4>
                            <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} isAnimationActive={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{expenseChartData.map((entry) => <Cell key={`cell-expense-${entry.name}`} fill={entry.color} />)}</Pie><Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} /></PieChart></ResponsiveContainer>
                        </div>
                    </div>
                )}
            </MobileModal>

            <div className={`fab-container ${isFabMenuOpen ? 'open' : ''}`}>
                 {isFabMenuOpen && (
                    <div className="fab-menu-items">
                         <div className="fab-item" onClick={() => openMobileView('transaction')}> <span className="fab-label">Transação</span> <div className="fab-icon-small">💸</div> </div>
                         <div className="fab-item" onClick={() => openMobileView('category')}> <span className="fab-label">Categorias</span> <div className="fab-icon-small">📂</div> </div>
                         <div className="fab-item" onClick={() => openMobileView('goals')}> <span className="fab-label">Metas</span> <div className="fab-icon-small">🎯</div> </div>
                         <div className="fab-item" onClick={() => openMobileView('charts')}> <span className="fab-label">Gráficos</span> <div className="fab-icon-small">📊</div> </div>
                    </div>
                 )}
                 <button className="mobile-fab" onClick={() => setIsFabMenuOpen(!isFabMenuOpen)} aria-label="Menu de Ações"> {isFabMenuOpen ? '✖' : '+'} </button>
            </div>

            <div className="dashboard-container">
                <header>
                    <h1>Meu Dashboard</h1>
                    <div className="header-controls">
                        <MonthNavigator currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
                        <button onClick={() => signOut(auth)} className="signout-button">Sair</button>
                    </div>
                </header>
                <main>
                    <div className="summary-grid">
                        <SummaryCard title="Recebimentos" value={incomeTotal} type="income" onClick={() => { setTypeFilter(typeFilterOptions[1]); transactionListRef.current?.scrollIntoView({ behavior: 'smooth' }); }} isActive={typeFilter.value === 'income'} />
                        <SummaryCard title="Despesas Pagas" value={expensePaid} type="expense" onClick={() => { setTypeFilter(typeFilterOptions[2]); transactionListRef.current?.scrollIntoView({ behavior: 'smooth' }); }} isActive={typeFilter.value === 'paidExpense'} />
                        <SummaryCard title="A Pagar" value={expenseToPay} type="pending" onClick={() => { setTypeFilter(typeFilterOptions[3]); transactionListRef.current?.scrollIntoView({ behavior: 'smooth' }); }} isActive={typeFilter.value === 'toPayExpense'} />
                        <SummaryCard title="Saldo Líquido" value={balance} type="balance" />
                    </div>
                    <div className="main-layout">
                        <div className="sidebar">
                            <div className="sidebar-block sidebar-main-widget">
                                <div className="sidebar-tabs">
                                    <button className={`sidebar-tab-button ${sidebarTab === 'transaction' ? 'active' : ''}`} onClick={() => setSidebarTab('transaction')}> Transação </button>
                                    <button className={`sidebar-tab-button ${sidebarTab === 'fixed' ? 'active' : ''}`} onClick={() => setSidebarTab('fixed')}> Fixos </button>
                                    <button className={`sidebar-tab-button ${sidebarTab === 'budget' ? 'active' : ''}`} onClick={() => setSidebarTab('budget')}> Orçamentos </button>
                                    <button className={`sidebar-tab-button ${sidebarTab === 'goal' ? 'active' : ''}`} onClick={() => setSidebarTab('goal')}> Metas </button>
                                </div>
                                <div className="sidebar-content-container">
                                    {sidebarTab === 'transaction' && ( <TransactionForm type={formType} setType={setFormType} /> )}
                                    {sidebarTab === 'fixed' && ( <FixedExpensesManager categories={categories} onAddFixedExpense={handleAddFixedExpense} fixedExpenses={fixedExpenses} onDeleteFixedExpense={handleDeleteFixedExpense} onEditFixedExpense={openEditFixedExpenseModal} /> )}
                                    {sidebarTab === 'budget' && ( <BudgetManager categories={categories} currentMonth={currentMonth} budgets={budgets} /> )}
                                    {sidebarTab === 'goal' && ( <GoalManager /> )} 
                                </div>
                            </div>
                            <div className="sidebar-block">
                                <CategoryManager categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={(id) => handleDeleteRequest(id, 'category')} onEditCategory={openEditCategoryModal} />
                            </div>
                            <div className="sidebar-block"><div className="sidebar-scroll-wrapper"><BudgetProgressList budgets={budgets} expensesByCategory={expensesByCategory} /></div></div>
                            <div className="sidebar-block"><div className="sidebar-scroll-wrapper"><GoalProgressList goals={goals} onAddFundsClick={openAddFundsModal} onWithdrawFundsClick={openWithdrawModal}/></div></div>
                        </div>

                        <div className="content">
                            <div className="charts-grid">
                                <div className="chart-item" onClick={() => navigate('/report', { state: { reportType: 'income', reportMonth: currentMonth } })} style={{ cursor: 'pointer' }}>
                                    <h4>Recebimentos</h4>
                                    <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={incomeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} isAnimationActive={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{incomeChartData.map((entry) => <Cell key={`cell-income-${entry.name}`} fill={entry.color} />)}</Pie><Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} /></PieChart></ResponsiveContainer>
                                </div>
                                <div className="chart-item" onClick={() => navigate('/report', { state: { reportType: 'expense', reportMonth: currentMonth } })} style={{ cursor: 'pointer' }}>
                                    <h4>Despesas</h4>
                                    <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} isAnimationActive={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{expenseChartData.map((entry) => <Cell key={`cell-expense-${entry.name}`} fill={entry.color} />)}</Pie><Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} /></PieChart></ResponsiveContainer>
                                </div>
                            </div>
                            <div className="transaction-view-tabs">
                                <button className={`tab-button ${transactionViewTab === 'monthly' ? 'active' : ''}`} onClick={() => setTransactionViewTab('monthly')}> Transações do Mês </button>
                                <button className={`tab-button ${transactionViewTab === 'fixed' ? 'active' : ''}`} onClick={() => setTransactionViewTab('fixed')}> Fixos Previstos </button>
                            </div>
                            <div className="list-container" ref={transactionListRef}>
                                <div className="list-container-header">
                                    <h3>{transactionViewTab === 'monthly' ? 'Extrato' : 'Previsão Fixa'}</h3>
                                    <div className="transaction-list-filters">
                                        <input type="text" placeholder="🔍 Filtrar..." value={descriptionFilter} onChange={(e) => setDescriptionFilter(e.target.value)} className="filter-input description-filter" />
                                        <Select options={typeFilterOptions} value={typeFilter} onChange={setTypeFilter} className="filter-input type-filter" classNamePrefix="react-select" />
                                        <Select options={categoryFilterOptions} value={categoryFilter} onChange={setCategoryFilter} placeholder="Categoria..." isClearable isMulti className="filter-input category-filter" classNamePrefix="react-select" />
                                    </div>
                                </div>
                                <TransactionList transactions={transactionsForDisplay} categories={categories} onDeleteTransaction={(id, type) => handleDeleteRequest(id, type)} onEditTransaction={openEditTransactionModal} onTogglePaid={handleTogglePaidStatus} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default Dashboard;