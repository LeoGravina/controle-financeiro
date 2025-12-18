import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp, updateDoc, writeBatch, getDocs, increment } from 'firebase/firestore'; 
import { auth, db } from '../firebase/config';
import Select from 'react-select'; 

// Importação do Hook
import { useTransactions } from '../hooks/useTransactions'; 

// Importando componentes
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

const createDefaultCategories = async (userId) => {
    const batch = writeBatch(db);
    const defaultCategories = [
        { name: 'Metas', color: '#6a82fb', userId: userId },
        { name: 'Alimentação', color: '#f39c12', userId: userId },
        { name: 'Transporte', color: '#3498db', userId: userId },
        { name: 'Lazer', color: '#2ecc71', userId: userId },
        { name: 'Moradia', color: '#9b59b6', userId: userId },
        { name: 'Salário', color: '#1abc9c', userId: userId },
        { name: 'Outros', color: '#bdc3c7', userId: userId }
    ];
    defaultCategories.forEach(cat => {
        const newCatRef = doc(collection(db, 'categories'));
        batch.set(newCatRef, cat);
    });
    try { await batch.commit(); } catch (error) { console.error("Erro ao criar categorias padrão:", error); }
};

// --- COMPONENTE MODAL MOBILE GENÉRICO ---
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
    const [user, setUser] = useState(null);
    const [categories, setCategories] = useState([]);
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

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, currentUser => setUser(currentUser || null));
        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (!user) {
            setCategories([]); setFixedExpenses([]); setBudgets([]); setGoals([]); 
            setLoadingOtherData(false); 
            return;
        }
        setLoadingOtherData(true); 
        let listenersActive = true;
        
        const unsubCategories = onSnapshot(query(collection(db, 'categories'), where('userId', '==', user.uid)), async (snap) => { 
            if (listenersActive) {
                if (snap.empty) { await createDefaultCategories(user.uid); } 
                else { setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }
            }
        });
        
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
            unsubCategories(); unsubFixedExpenses(); unsubBudgets(); unsubGoals(); 
        };
    }, [user, currentMonth]);

    useEffect(() => {
        const listElement = transactionListRef.current?.querySelector('ul');
        if (listElement) { listElement.scrollTop = 0; }
    }, [descriptionFilter, categoryFilter, typeFilter, transactionViewTab]);

    const openMobileView = (viewName) => {
        setMobileView(viewName);
        setIsFabMenuOpen(false); 
    };

    const openEditTransactionModal = (transaction) => { setMobileView(null); setEditingTransaction(transaction); setIsEditTransactionModalOpen(true); };
    const openEditCategoryModal = (category) => { setMobileView(null); setEditingCategory(category); setIsEditCategoryModalOpen(true); };
    const openEditFixedExpenseModal = (expense) => { setMobileView(null); setEditingFixedExpense(expense); setIsEditFixedExpenseModalOpen(true); };
    const openAddFundsModal = (goal) => { setMobileView(null); setSelectedGoal(goal); setIsAddFundsModalOpen(true); };
    const openWithdrawModal = (goal) => { setMobileView(null); setSelectedGoal(goal); setIsWithdrawModalOpen(true); };

    // --- ACTIONS ---
    const handleDeleteRequest = (id, type) => {
        setMobileView(null); 
        if (type === 'transaction' && id.startsWith('fixed-')) { alert("Despesas fixas só podem ser removidas na seção 'Despesas Fixas'."); return; } 
        if (type === 'fixedExpense') { handleDeleteFixedExpense(id); return; } 
        let transactionData = null;
        if (type === 'transaction') { transactionData = transactions.find(t => t.id === id) || null; }
        setDeleteModalState({ isOpen: true, id, type, transactionData });
    };

    const handleAddTransaction = async (transaction) => {
        if (!user) return; const { isInstallment, installments, ...rest } = transaction;
        const dataToAdd = { ...rest, userId: user.uid, date: Timestamp.fromDate(transaction.date), isPaid: transaction.isPaid || false };
        try {
            if (isInstallment && transaction.type === 'expense') {
                const batch = writeBatch(db);
                const groupId = doc(collection(db, 'transactions')).id; 
                const installmentAmount = transaction.amount / installments;
                if (installments > 1) {
                    for (let i = 0; i < installments; i++) {
                        const installmentDate = new Date(transaction.date); installmentDate.setMonth(installmentDate.getMonth() + i);
                        if (installmentDate.getDate() !== transaction.date.getDate()) installmentDate.setDate(0);
                        const newTransactionRef = doc(collection(db, 'transactions'));
                        batch.set(newTransactionRef, { 
                            ...dataToAdd, amount: installmentAmount, description: `${transaction.description} (${i + 1}/${installments})`, 
                            date: Timestamp.fromDate(installmentDate), installmentGroupId: groupId, totalAmount: transaction.amount 
                        });
                    }
                    await batch.commit();
                } else {
                    await addDoc(collection(db, 'transactions'), { 
                        ...dataToAdd, description: `${transaction.description} (1/1)`, installmentGroupId: groupId, totalAmount: transaction.amount
                    });
                }
            } else {
                await addDoc(collection(db, 'transactions'), dataToAdd);
            }
            setMobileView(null);
        } catch (error) { console.error("Erro Adicionar Transação:", error); }
    };
    
    const handleUpdateTransaction = async (updatedTransaction) => {
        if (!user || !updatedTransaction.id) return;
        if (updatedTransaction.installmentGroupId && updatedTransaction.isInstallment) {
            try {
                const batch = writeBatch(db);
                const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('installmentGroupId', '==', updatedTransaction.installmentGroupId));
                const querySnapshot = await getDocs(q);
                let originalStartDate = updatedTransaction.date instanceof Date ? updatedTransaction.date : updatedTransaction.date.toDate();
                querySnapshot.forEach((doc) => { batch.delete(doc.ref); });
                const newTotalAmount = updatedTransaction.amount; 
                const newInstallments = updatedTransaction.installments;
                const newInstallmentAmount = newTotalAmount / newInstallments;
                for (let i = 0; i < newInstallments; i++) {
                    const installmentDate = new Date(originalStartDate); installmentDate.setMonth(installmentDate.getMonth() + i);
                    if (installmentDate.getDate() !== originalStartDate.getDate()) installmentDate.setDate(0);
                    const newTransactionRef = doc(collection(db, 'transactions'));
                    batch.set(newTransactionRef, {
                        userId: user.uid, description: `${updatedTransaction.description} (${i + 1}/${newInstallments})`,
                        amount: newInstallmentAmount, totalAmount: newTotalAmount, date: Timestamp.fromDate(installmentDate),
                        type: updatedTransaction.type, category: updatedTransaction.category, paymentMethod: updatedTransaction.paymentMethod,
                        isPaid: updatedTransaction.isPaid || false, installmentGroupId: updatedTransaction.installmentGroupId,
                    });
                }
                await batch.commit();
                setIsEditTransactionModalOpen(false); setEditingTransaction(null);
            } catch (error) { console.error("Erro atualizar grupo:", error); alert("Erro ao salvar parcelas."); }
        } else {
            try {
                const { id, ...dataToUpdate } = updatedTransaction;
                if (dataToUpdate.date instanceof Date) dataToUpdate.date = Timestamp.fromDate(dataToUpdate.date);
                if (dataToUpdate.isInstallment === false) { delete dataToUpdate.installmentGroupId; delete dataToUpdate.totalAmount; dataToUpdate.description = dataToUpdate.description.replace(/\s*\(\d+\/\d+\)$/, '').trim(); }
                await updateDoc(doc(db, 'transactions', id), dataToUpdate);
                setIsEditTransactionModalOpen(false); setEditingTransaction(null);
            } catch (error) { console.error("Erro Atualizar Transação:", error); }
        }
    };

    const handleAddCategory = async (category) => {
        if (!user) return; const existing = categories.find(c => c.name.toLowerCase() === category.name.toLowerCase()); if (existing) { alert("Categoria já existe."); return; } try { await addDoc(collection(db, 'categories'), { ...category, userId: user.uid }); } catch (error) { console.error("Erro Adicionar Categoria:", error); }
        setMobileView(null);
    };
    
    const handleUpdateCategory = async (updatedCategory) => {
        if (!user || !updatedCategory.id) return;
        const existing = categories.find(c => c.name.toLowerCase() === updatedCategory.name.toLowerCase() && c.id !== updatedCategory.id);
        if (existing) { alert("Já existe outra categoria com este nome."); return; }
        const oldCategory = categories.find(c => c.id === updatedCategory.id);
        const oldName = oldCategory ? oldCategory.name : null;
        const newName = updatedCategory.name.trim();
        if (!oldName || oldName === newName) {
            try { await updateDoc(doc(db, 'categories', updatedCategory.id), { color: updatedCategory.color }); } catch (error) { console.error("Erro cor:", error); }
            setIsEditCategoryModalOpen(false); setEditingCategory(null); return; 
        }
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'categories', updatedCategory.id), { name: newName, color: updatedCategory.color });
            const qTransactions = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('category', '==', oldName));
            const qBudgets = query(collection(db, 'budgets'), where('userId', '==', user.uid), where('categoryName', '==', oldName));
            const [transactionsSnapshot, budgetsSnapshot] = await Promise.all([ getDocs(qTransactions), getDocs(qBudgets) ]);
            transactionsSnapshot.forEach((doc) => { batch.update(doc.ref, { category: newName }); });
            budgetsSnapshot.forEach((doc) => { batch.update(doc.ref, { categoryName: newName }); });
            await batch.commit();
            setIsEditCategoryModalOpen(false); setEditingCategory(null);
        } catch (error) { console.error("Erro update full:", error); alert("Erro ao atualizar."); }
    };

    const handleTogglePaidStatus = async (transaction) => {
        if (transaction.installmentGroupId && !transaction.isPaid) { setPaymentActionModal({ isOpen: true, transaction: transaction }); return; }
        if (transaction.isFixed && !transaction.isPaid) { 
            const realTransaction = { ...transaction }; delete realTransaction.id; delete realTransaction.isFixed; realTransaction.isPaid = true; 
            await handleAddTransaction(realTransaction); 
        } else if (!transaction.isFixed && transaction.id) { 
            try { await updateDoc(doc(db, 'transactions', transaction.id), { isPaid: !transaction.isPaid }); } catch (error) { console.error("Erro Toggle Pago:", error); } 
        }
    };

    const handlePaymentAction = async (actionType, transaction) => {
        setPaymentActionModal({ isOpen: false, transaction: null });
        if (!transaction || !transaction.id || !user) return;
        try {
            if (actionType === 'single') { await updateDoc(doc(db, 'transactions', transaction.id), { isPaid: true }); } 
            else if (actionType === 'all') {
                const batch = writeBatch(db);
                const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('installmentGroupId', '==', transaction.installmentGroupId));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => { if (!doc.data().isPaid) batch.update(doc.ref, { isPaid: true }); });
                await batch.commit();
            }
        } catch (error) { console.error("Erro pagamento parcela:", error); alert("Erro ao salvar."); }
    };
    
    const handleConfirmDelete = async () => {
        const { id, type, transactionData } = deleteModalState; 
        if (!id || !type) return;
        const collectionName = type === 'transaction' ? 'transactions' : 'categories';
        setDeleteModalState({ isOpen: false, id: null, type: null, transactionData: null }); 
        
        if (type === 'category') {
             const categoryToDelete = categories.find(c => c.id === id);
             if (categoryToDelete?.name.toLowerCase() === 'metas') { alert("Não é possível excluir a categoria 'Metas'."); return; }
        }
        try {
            if (type === 'transaction' && transactionData?.installmentGroupId) {
                const batch = writeBatch(db);
                const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('installmentGroupId', '==', transactionData.installmentGroupId));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => { batch.delete(doc.ref); });
                await batch.commit();
            }
            else if (type === 'transaction' && transactionData?.description?.startsWith('Contribuição para Meta:')) {
                const goalName = transactionData.description.replace('Contribuição para Meta: ', '').trim();
                const goalToUpdate = goals.find(g => g.goalName === goalName);
                const batch = writeBatch(db);
                batch.delete(doc(db, 'transactions', id)); 
                if (goalToUpdate) { batch.update(doc(db, 'goals', goalToUpdate.id), { currentAmount: increment(-transactionData.amount) }); }
                await batch.commit(); 
            }
            else { await deleteDoc(doc(db, collectionName, id)); }
        } catch (error) { console.error(`Erro ao Deletar ${type}:`, error); alert(`Erro ao excluir.`); }
    };
    
    const handleAddFixedExpense = async (expense) => { if (!user) return; try { await addDoc(collection(db, 'fixedExpenses'), { ...expense, userId: user.uid }); } catch (error) { console.error("Erro Add Fixo:", error); } };
    const handleDeleteFixedExpense = (id) => { if (!user) return; setDeleteModalState({ isOpen: true, id: id, type: 'fixedExpense' }); };
    const handleConfirmDeleteFixedExpense = async () => { const { id } = deleteModalState; if (!id) return; setDeleteModalState({ isOpen: false, id: null, type: null }); try { await deleteDoc(doc(db, 'fixedExpenses', id)); } catch(error) { console.error("Erro Delete Fixo:", error); } };
    const handleUpdateFixedExpense = async (updatedExpense) => { if (!user || !updatedExpense.id) return; try { const { id, ...dataToUpdate } = updatedExpense; await updateDoc(doc(db, 'fixedExpenses', id), dataToUpdate); setIsEditFixedExpenseModalOpen(false); setEditingFixedExpense(null); } catch (error) { console.error("Erro Update Fixo:", error); } };
    const handleSignOut = () => signOut(auth);
    const handleCardFilterAndScroll = (filterValue) => { const newFilter = typeFilterOptions.find(opt => opt.value === filterValue) || typeFilterOptions[0]; setTypeFilter(newFilter); transactionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const handleChartClick = (type) => { navigate('/report', { state: { reportType: type, reportMonth: currentMonth } }); };

    const closeAddFundsModal = () => { setSelectedGoal(null); setIsAddFundsModalOpen(false); };
    const handleAddFundsToGoal = async (goal, amount, paymentMethod) => {
        if (!user || !goal || amount <= 0 || !paymentMethod) throw new Error("Dados inválidos.");
        const metaCategory = categories.find(c => c.name.toLowerCase() === 'metas');
        if (!metaCategory) throw new Error("Categoria 'Metas' não encontrada.");
        const batch = writeBatch(db);
        batch.update(doc(db, 'goals', goal.id), { currentAmount: increment(amount) });
        const newTransactionRef = doc(collection(db, 'transactions'));
        batch.set(newTransactionRef, { userId: user.uid, description: `Contribuição para Meta: ${goal.goalName}`, amount: amount, date: Timestamp.now(), type: 'expense', category: metaCategory.name, paymentMethod: paymentMethod, isPaid: true, isInstallment: false, installments: 1 });
        await batch.commit();
    };

    const closeWithdrawModal = () => { setSelectedGoal(null); setIsWithdrawModalOpen(false); };
    const handleWithdrawFromGoal = async (goal, amount, paymentMethod) => {
        if (!user || !goal || amount <= 0 || amount > goal.currentAmount || !paymentMethod) throw new Error("Dados inválidos.");
        const metaCategory = categories.find(c => c.name.toLowerCase() === 'metas');
        if (!metaCategory) throw new Error("Categoria 'Metas' não encontrada.");
        const batch = writeBatch(db);
        batch.update(doc(db, 'goals', goal.id), { currentAmount: increment(-amount) });
        const newTransactionRef = doc(collection(db, 'transactions'));
        batch.set(newTransactionRef, { userId: user.uid, description: `Resgate da Meta: ${goal.goalName}`, amount: amount, date: Timestamp.now(), type: 'income', category: metaCategory.name, paymentMethod: paymentMethod, isPaid: true, isInstallment: false, installments: 1 });
        await batch.commit();
    };

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
            <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => { setIsEditCategoryModalOpen(false); setEditingCategory(null); }} category={editingCategory} onSave={handleUpdateCategory} />
            <EditFixedExpenseModal isOpen={isEditFixedExpenseModalOpen} onClose={() => { setIsEditFixedExpenseModalOpen(false); setEditingFixedExpense(null); }} expense={editingFixedExpense} categories={categories} onSave={handleUpdateFixedExpense} />
            <AddFundsToGoalModal isOpen={isAddFundsModalOpen} onClose={closeAddFundsModal} goal={selectedGoal} categories={categories} onSave={handleAddFundsToGoal} />
            <WithdrawFromGoalModal isOpen={isWithdrawModalOpen} onClose={closeWithdrawModal} goal={selectedGoal} categories={categories} onSave={handleWithdrawFromGoal} />
            <ActionModal isOpen={paymentActionModal.isOpen} onClose={() => setPaymentActionModal({ isOpen: false, transaction: null })} title="Confirmar Pagamento de Parcela" message={`Você está pagando: "${paymentActionModal.transaction?.description || 'parcela'}". Como deseja continuar?`} actions={[ { label: 'Pagar somente esta', onClick: () => handlePaymentAction('single', paymentActionModal.transaction), className: 'confirm', style: { backgroundColor: 'var(--primary-color)' } }, { label: 'Quitar (Pagar todas)', onClick: () => handlePaymentAction('all', paymentActionModal.transaction), className: 'confirm', style: { backgroundColor: 'var(--income-color)' } }, { label: 'Cancelar', onClick: () => setPaymentActionModal({ isOpen: false, transaction: null }), className: 'cancel' } ]} />

            <MobileModal isOpen={!!mobileView} onClose={() => setMobileView(null)} title={
                mobileView === 'transaction' ? 'Adicionar Transação' :
                mobileView === 'category' ? 'Gerenciar Categorias' :
                mobileView === 'goals' ? 'Minhas Metas' :
                mobileView === 'fixed' ? 'Despesas Fixas' :
                mobileView === 'budget' ? 'Meus Orçamentos' :
                mobileView === 'charts' ? 'Gráficos do Mês' : ''
            }>
                {mobileView === 'transaction' && ( <TransactionForm categories={categories} onAddTransaction={handleAddTransaction} type={formType} setType={setFormType} /> )}
                {mobileView === 'category' && ( <CategoryManager categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={(id) => handleDeleteRequest(id, 'category')} onEditCategory={openEditCategoryModal} /> )}
                {mobileView === 'goals' && ( <GoalProgressList goals={goals} onAddFundsClick={openAddFundsModal} onWithdrawFundsClick={openWithdrawModal}/> )}
                {mobileView === 'fixed' && ( <FixedExpensesManager categories={categories} onAddFixedExpense={handleAddFixedExpense} fixedExpenses={fixedExpenses} onDeleteFixedExpense={handleDeleteFixedExpense} onEditFixedExpense={openEditFixedExpenseModal} /> )}
                {mobileView === 'budget' && ( <BudgetManager categories={categories} currentMonth={currentMonth} budgets={budgets} /> )}
                {mobileView === 'charts' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                         <div className="chart-item">
                            <h4>Recebimentos por Categoria</h4>
                            {incomeChartData.length > 0 ? ( <ResponsiveContainer width="100%" height={250}> <PieChart> <Pie data={incomeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}> {incomeChartData.map((entry) => <Cell key={`cell-income-${entry.name}`} fill={entry.color} />)} </Pie> <Tooltip content={<CustomTooltip />} /> </PieChart> </ResponsiveContainer> ) : <p className="empty-message">Nenhum recebimento neste mês.</p>}
                         </div>
                         <div className="chart-item">
                            <h4>Despesas por Categoria</h4>
                            {expenseChartData.length > 0 ? ( <ResponsiveContainer width="100%" height={250}> <PieChart> <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}> {expenseChartData.map((entry) => <Cell key={`cell-expense-${entry.name}`} fill={entry.color} />)} </Pie> <Tooltip content={<CustomTooltip />} /> </PieChart> </ResponsiveContainer> ) : <p className="empty-message">Nenhum gasto neste mês.</p>}
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
                        <button onClick={handleSignOut} className="signout-button">Sair</button>
                    </div>
                </header>
                <main>
                    <div className="summary-grid">
                        <SummaryCard title="Recebimentos do Mês" value={incomeTotal} type="income" onClick={() => handleCardFilterAndScroll('income')} isActive={typeFilter.value === 'income'} data-tooltip="Filtrar lista: Mostrar apenas Recebimentos" />
                        <SummaryCard title="Despesas Pagas" value={expensePaid} type="expense" onClick={() => handleCardFilterAndScroll('paidExpense')} isActive={typeFilter.value === 'paidExpense'} data-tooltip="Filtrar lista: Mostrar apenas Despesas Pagas" />
                        <SummaryCard title="Despesas a Pagar" value={expenseToPay} type="expense" onClick={() => handleCardFilterAndScroll('toPayExpense')} isActive={typeFilter.value === 'toPayExpense'} data-tooltip="Filtrar lista: Mostrar apenas Despesas a Pagar" />
                        <SummaryCard title="Saldo (Receb. - Pagos)" value={balance} type="balance" data-tooltip="Saldo do Mês (Recebimentos - Despesas Pagas)" />
                    </div>
                    <div className="main-layout">
                        
                        {/* --- SIDEBAR CORRIGIDA COM WRAPPER --- */}
                        <div className="sidebar">
                            
                            {/* Novo Wrapper para conectar Abas e Conteúdo */}
                            <div className="sidebar-main-widget">
                                <div className="sidebar-tabs">
                                    <button className={`sidebar-tab-button ${sidebarTab === 'transaction' ? 'active' : ''}`} onClick={() => setSidebarTab('transaction')}> Transação </button>
                                    <button className={`sidebar-tab-button ${sidebarTab === 'fixed' ? 'active' : ''}`} onClick={() => setSidebarTab('fixed')}> Fixos </button>
                                    <button className={`sidebar-tab-button ${sidebarTab === 'budget' ? 'active' : ''}`} onClick={() => setSidebarTab('budget')}> Orçamentos </button>
                                    <button className={`sidebar-tab-button ${sidebarTab === 'goal' ? 'active' : ''}`} onClick={() => setSidebarTab('goal')}> Metas </button>
                                </div>
                                <div className="sidebar-content-container">
                                    {sidebarTab === 'transaction' && ( <TransactionForm categories={categories} onAddTransaction={handleAddTransaction} type={formType} setType={setFormType} /> )}
                                    {sidebarTab === 'fixed' && ( <FixedExpensesManager categories={categories} onAddFixedExpense={handleAddFixedExpense} fixedExpenses={fixedExpenses} onDeleteFixedExpense={handleDeleteFixedExpense} onEditFixedExpense={openEditFixedExpenseModal} /> )}
                                    {sidebarTab === 'budget' && ( <BudgetManager categories={categories} currentMonth={currentMonth} budgets={budgets} /> )}
                                    {sidebarTab === 'goal' && ( <GoalManager /> )} 
                                </div>
                            </div>
                            {/* Fim do Wrapper */}

                            <CategoryManager categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={(id) => handleDeleteRequest(id, 'category')} onEditCategory={openEditCategoryModal} />
                            <BudgetProgressList budgets={budgets} expensesByCategory={expensesByCategory} />
                            <GoalProgressList goals={goals} onAddFundsClick={openAddFundsModal} onWithdrawFundsClick={openWithdrawModal}/> 
                        </div>

                        <div className="content">
                            <div className="charts-grid">
                                <div className="chart-item" onClick={() => handleChartClick('income')} style={{ cursor: 'pointer' }} data-tooltip="Ir para página de relatório de ganhos">
                                    <h4>Recebimentos por Categoria</h4>
                                    {incomeChartData.length > 0 ? ( <ResponsiveContainer width="100%" height={250}> <PieChart> <Pie data={incomeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}> {incomeChartData.map((entry) => <Cell key={`cell-income-${entry.name}`} fill={entry.color} />)} </Pie> <Tooltip content={<CustomTooltip />} /> </PieChart> </ResponsiveContainer> ) : <p className="empty-message">Nenhum recebimento neste mês.</p>}
                                </div>
                                <div className="chart-item" onClick={() => handleChartClick('expense')} style={{ cursor: 'pointer' }} data-tooltip="Ir para página de relatório de despesas">
                                    <h4>Despesas por Categoria</h4>
                                    {expenseChartData.length > 0 ? ( <ResponsiveContainer width="100%" height={250}> <PieChart> <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}> {expenseChartData.map((entry) => <Cell key={`cell-expense-${entry.name}`} fill={entry.color} />)} </Pie> <Tooltip content={<CustomTooltip />} /> </PieChart> </ResponsiveContainer> ) : <p className="empty-message">Nenhuma despesa neste mês.</p>}
                                </div>
                            </div>
                            <div className="transaction-view-tabs">
                                <button className={`tab-button ${transactionViewTab === 'monthly' ? 'active' : ''}`} onClick={() => setTransactionViewTab('monthly')}> Transações do Mês </button>
                                <button className={`tab-button ${transactionViewTab === 'fixed' ? 'active' : ''}`} onClick={() => setTransactionViewTab('fixed')}> Despesas Fixas Previstas </button>
                            </div>
                            <div className="list-container" ref={transactionListRef}>
                                <div className="list-container-header">
                                    <h3>{transactionViewTab === 'monthly' ? 'Transações do Mês' : 'Despesas Fixas Previstas'}</h3>
                                    <div className="transaction-list-filters">
                                        <input type="text" placeholder="🔍 Filtrar por descrição..." value={descriptionFilter} onChange={(e) => setDescriptionFilter(e.target.value)} className="filter-input description-filter" />
                                        <Select options={typeFilterOptions} value={typeFilter} onChange={setTypeFilter} className="filter-input type-filter" classNamePrefix="react-select" />
                                        <Select options={categoryFilterOptions} value={categoryFilter} onChange={setCategoryFilter} placeholder="Categoria(s)..." isClearable={true} isMulti closeMenuOnSelect={false} hideSelectedOptions={false} controlShouldRenderValue={false} className="filter-input category-filter" classNamePrefix="react-select" />
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