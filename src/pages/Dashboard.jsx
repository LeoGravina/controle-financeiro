/*
  Dashboard.jsx COMPLETO E FINAL
  - Inclui 'Edição Inteligente' de parcelas (recria grupo com writeBatch).
  - Inclui 'Exclusão Inteligente' de parcelas (exclui grupo com writeBatch).
  - Inclui 'Pagamento Inteligente' (usa ActionModal para 'Pagar esta' ou 'Quitar').
  - Inclui 'Resgate de Metas' (cria Ganho e subtrai da meta).
*/
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FaThumbtack } from 'react-icons/fa';
import { onAuthStateChanged, signOut } from 'firebase/auth';
// increment e getDocs importados
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp, updateDoc, writeBatch, getDocs, increment } from 'firebase/firestore'; 
import { auth, db } from '../firebase/config';
import Select from 'react-select'; 

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
// Importa o modal de Ação (para Pagamento)
import ActionModal from '../components/ActionModal'; 
// Importa o modal de Resgate (para Metas)
import WithdrawFromGoalModal from '../components/WithdrawFromGoalModal'; 

// Tooltip Personalizado
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

// Opções para o filtro de tipo
const typeFilterOptions = [
    { value: 'all', label: 'Tipo (Todos)' },
    { value: 'income', label: 'Ganhos' },
    { value: 'paidExpense', label: 'Desp. Pagas' },
    { value: 'toPayExpense', label: 'Desp. a Pagar' }
];

// Função para criar categorias padrão para novos usuários
const createDefaultCategories = async (userId) => {
    const batch = writeBatch(db);
    const defaultCategories = [
        { name: 'Metas', color: '#6a82fb', userId: userId }, // Categoria CRUCIAL
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
    
    try {
        await batch.commit();
        console.log("Categorias padrão criadas com sucesso!");
    } catch (error) {
        console.error("Erro ao criar categorias padrão:", error);
    }
};


const Dashboard = () => {
    // Estados
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [fixedExpenses, setFixedExpenses] = useState([]);
    const [budgets, setBudgets] = useState([]); 
    const [goals, setGoals] = useState([]); 
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(true); 
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
    // Estados dos Modais de Metas
    const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false); 
    const [selectedGoal, setSelectedGoal] = useState(null); 
    // Estado do Modal de Ação de Pagamento
    const [paymentActionModal, setPaymentActionModal] = useState({ isOpen: false, transaction: null });

    const navigate = useNavigate();
    const transactionListRef = useRef(null);

    // Efeito de Autenticação
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, currentUser => setUser(currentUser || null));
        return () => unsubAuth();
    }, []);

    // useEffect para buscar TUDO com onSnapshot
    useEffect(() => {
        if (!user) {
            setTransactions([]); setCategories([]); setFixedExpenses([]); setBudgets([]); setGoals([]); 
            setLoading(false); 
            return;
        }
        setLoading(true); 
        let listenersActive = true;
        let dataLoaded = { categories: false, transactions: false, fixedExpenses: false, budgets: false, goals: false }; 

        const checkLoadingDone = () => {
            if (listenersActive && Object.values(dataLoaded).every(status => status === true)) {
                setLoading(false);
            }
        };

        // Listener de Categorias (com criação de Padrão)
        const unsubCategories = onSnapshot(query(collection(db, 'categories'), where('userId', '==', user.uid)), async (snap) => { 
            if (listenersActive) {
                if (snap.empty) {
                    console.log("Usuário sem categorias, criando padrões...");
                    await createDefaultCategories(user.uid);
                } else {
                    setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
                dataLoaded.categories = true; 
                checkLoadingDone(); 
            }
        }, err => { console.error("Erro Cat:", err); if (listenersActive) setLoading(false); });
        
        const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), where('userId', '==', user.uid)), (snap) => {
            if (listenersActive) { setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() }))); dataLoaded.transactions = true; checkLoadingDone(); }
        }, err => { console.error("Erro Trans:", err); if (listenersActive) setLoading(false); });
        
        const unsubFixedExpenses = onSnapshot(query(collection(db, 'fixedExpenses'), where('userId', '==', user.uid)), (snap) => { 
            if (listenersActive) { setFixedExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))); dataLoaded.fixedExpenses = true; checkLoadingDone(); }
        }, err => console.error("Erro Fixed:", err));
        
        const month = currentMonth.getMonth();
        const year = currentMonth.getFullYear();
        const budgetQuery = query(collection(db, 'budgets'), where('userId', '==', user.uid), where('month', '==', month), where('year', '==', year) );
        const unsubBudgets = onSnapshot(budgetQuery, (snap) => {
             if (listenersActive) { setBudgets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); dataLoaded.budgets = true; checkLoadingDone(); }
        }, (error) => {
            console.error("Erro ao buscar orçamentos (onSnapshot):", error);
            if (listenersActive) { setBudgets([]); dataLoaded.budgets = true; checkLoadingDone(); }
        });

        const goalsQuery = query(collection(db, 'goals'), where('userId', '==', user.uid));
        const unsubGoals = onSnapshot(goalsQuery, (snap) => {
            if (listenersActive) {
                const fetchedGoals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedGoals.sort((a, b) => a.goalName.localeCompare(b.goalName)); 
                setGoals(fetchedGoals);
                dataLoaded.goals = true; 
                checkLoadingDone(); 
            }
        }, (error) => {
            console.error("Erro ao buscar metas (onSnapshot):", error);
             if (listenersActive) { setGoals([]); dataLoaded.goals = true; checkLoadingDone(); }
        });

        // Função de limpeza
        return () => { 
            listenersActive = false; 
            unsubCategories(); 
            unsubTransactions(); 
            unsubFixedExpenses(); 
            unsubBudgets(); 
            unsubGoals(); 
        };
    }, [user, currentMonth]); 

    // useEffect para rolar a lista para o topo ao mudar filtros
    useEffect(() => {
        const listElement = transactionListRef.current?.querySelector('ul');
        if (listElement) { listElement.scrollTop = 0; }
    }, [descriptionFilter, categoryFilter, typeFilter, transactionViewTab]);

    // Funções handle...
    const handleAddTransaction = async (transaction) => {
        if (!user) return; const { isInstallment, installments, ...rest } = transaction;
        const dataToAdd = { ...rest, userId: user.uid, date: Timestamp.fromDate(transaction.date), isPaid: transaction.isPaid || false };
        try {
            if (isInstallment && transaction.type === 'expense') {
                if (installments > 1) {
                    const installmentAmount = transaction.amount / installments;
                    const batch = writeBatch(db);
                    const groupId = doc(collection(db, 'transactions')).id; 

                    for (let i = 0; i < installments; i++) {
                        const installmentDate = new Date(transaction.date); installmentDate.setMonth(installmentDate.getMonth() + i);
                        if (installmentDate.getDate() !== transaction.date.getDate()) installmentDate.setDate(0);
                        const newTransactionRef = doc(collection(db, 'transactions'));
                        
                        batch.set(newTransactionRef, { 
                            ...dataToAdd, 
                            amount: installmentAmount, 
                            description: `${transaction.description} (${i + 1}/${installments})`, 
                            date: Timestamp.fromDate(installmentDate),
                            installmentGroupId: groupId,
                            totalAmount: transaction.amount 
                        });
                    }
                    await batch.commit();
                } else {
                    await addDoc(collection(db, 'transactions'), { 
                        ...dataToAdd, 
                        description: `${transaction.description} (1/1)`,
                        installmentGroupId: doc(collection(db, 'transactions')).id, 
                        totalAmount: transaction.amount
                    });
                }
            } else {
                await addDoc(collection(db, 'transactions'), dataToAdd);
            }
        } catch (error) { console.error("Erro Adicionar Transação:", error); }
    };
    
    const handleUpdateTransaction = async (updatedTransaction) => {
        if (!user || !updatedTransaction.id) return;

        // CASO 1: É UMA ATUALIZAÇÃO DE GRUPO DE PARCELAMENTO
        if (updatedTransaction.installmentGroupId && updatedTransaction.isInstallment) {
            
            try {
                const batch = writeBatch(db);
                
                const q = query(collection(db, 'transactions'), 
                            where('userId', '==', user.uid), 
                            where('installmentGroupId', '==', updatedTransaction.installmentGroupId));
                            
                const querySnapshot = await getDocs(q);
                
                let originalStartDate = updatedTransaction.date.toDate(); 
                let found = false;

                querySnapshot.forEach((doc) => {
                    if (!found) {
                        found = true;
                    }
                    batch.delete(doc.ref);
                });

                const newTotalAmount = updatedTransaction.amount; 
                const newInstallments = updatedTransaction.installments;
                const newInstallmentAmount = newTotalAmount / newInstallments;
                const newGroupId = updatedTransaction.installmentGroupId; 

                for (let i = 0; i < newInstallments; i++) {
                    const installmentDate = new Date(originalStartDate);
                    installmentDate.setMonth(installmentDate.getMonth() + i);
                    if (installmentDate.getDate() !== originalStartDate.getDate()) {
                        installmentDate.setDate(0);
                    }

                    const newTransactionRef = doc(collection(db, 'transactions'));
                    batch.set(newTransactionRef, {
                        userId: user.uid,
                        description: `${updatedTransaction.description} (${i + 1}/${newInstallments})`,
                        amount: newInstallmentAmount,
                        totalAmount: newTotalAmount,
                        date: Timestamp.fromDate(installmentDate),
                        type: updatedTransaction.type,
                        category: updatedTransaction.category,
                        paymentMethod: updatedTransaction.paymentMethod,
                        isPaid: updatedTransaction.isPaid || false, 
                        installmentGroupId: newGroupId,
                    });
                }

                await batch.commit();
                
                setIsEditTransactionModalOpen(false);
                setEditingTransaction(null);

            } catch (error) {
                console.error("Erro ao atualizar grupo de parcelas:", error);
                alert("Erro ao salvar as parcelas. Tente novamente.");
            }

        } else {
            // CASO 2: Lógica antiga (atualização de transação única)
            try {
                const { id, ...dataToUpdate } = updatedTransaction;
                
                if (dataToUpdate.date instanceof Date) {
                    dataToUpdate.date = Timestamp.fromDate(dataToUpdate.date);
                }
                
                if (dataToUpdate.isInstallment === false) { 
                    delete dataToUpdate.installmentGroupId;
                    delete dataToUpdate.totalAmount;
                    dataToUpdate.description = dataToUpdate.description.replace(/\s*\(\d+\/\d+\)$/, '').trim();
                }

                await updateDoc(doc(db, 'transactions', id), dataToUpdate);
                setIsEditTransactionModalOpen(false);
                setEditingTransaction(null);
            } catch (error) {
                console.error("Erro Atualizar Transação (única):", error);
            }
        }
    };

    const handleAddCategory = async (category) => {
        if (!user) return; const existing = categories.find(c => c.name.toLowerCase() === category.name.toLowerCase()); if (existing) { alert("Categoria já existe."); return; } try { await addDoc(collection(db, 'categories'), { ...category, userId: user.uid }); } catch (error) { console.error("Erro Adicionar Categoria:", error); }
    };
    
    const handleUpdateCategory = async (updatedCategory) => {
        if (!user || !updatedCategory.id) return; const existing = categories.find(c => c.name.toLowerCase() === updatedCategory.name.toLowerCase() && c.id !== updatedCategory.id); if (existing) { alert("Já existe outra categoria com este nome."); return; } const oldCategory = categories.find(c => c.id === updatedCategory.id); const oldName = oldCategory ? oldCategory.name : null; const newName = updatedCategory.name.trim(); if (!oldName || oldName === newName) { try { await updateDoc(doc(db, 'categories', updatedCategory.id), { color: updatedCategory.color }); } catch (error) { console.error("Erro Atualizar Cor Categoria:", error); } setIsEditCategoryModalOpen(false); setEditingCategory(null); return; } try { const batch = writeBatch(db); batch.update(doc(db, 'categories', updatedCategory.id), { name: newName, color: updatedCategory.color }); const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('category', '==', oldName)); const querySnapshot = await getDocs(q); querySnapshot.forEach((document) => batch.update(doc(db, 'transactions', document.id), { category: newName })); await batch.commit(); setIsEditCategoryModalOpen(false); setEditingCategory(null); } catch (error) { console.error("Erro Atualizar Categoria & Transações:", error); alert("Erro ao atualizar."); }
    };
    
    const handleTogglePaidStatus = async (transaction) => {
        // CASO 1: É O PAGAMENTO DE UMA PARCELA (indo de 'não pago' para 'pago')
        if (transaction.installmentGroupId && !transaction.isPaid) {
            setPaymentActionModal({ isOpen: true, transaction: transaction });
            return; 
        }

        // CASO 2: LÓGICA ANTIGA (Gasto Fixo, Transação Normal, ou DESMARCAR um pagamento)
        if (transaction.isFixed && !transaction.isPaid) { 
            const realTransaction = { ...transaction }; 
            delete realTransaction.id; 
            delete realTransaction.isFixed; 
            realTransaction.isPaid = true; 
            await handleAddTransaction(realTransaction); 
        } else if (!transaction.isFixed && transaction.id) { 
            try { 
                await updateDoc(doc(db, 'transactions', transaction.id), { isPaid: !transaction.isPaid }); 
            } catch (error) { 
                console.error("Erro Toggle Pago:", error); 
            } 
        }
    };

    /** Processa a escolha do usuário no modal de pagamento de parcela */
    const handlePaymentAction = async (actionType, transaction) => {
        setPaymentActionModal({ isOpen: false, transaction: null });
        if (!transaction || !transaction.id || !user) return;

        try {
            if (actionType === 'single') {
                await updateDoc(doc(db, 'transactions', transaction.id), { isPaid: true });
            } 
            else if (actionType === 'all') {
                const batch = writeBatch(db);
                
                const q = query(collection(db, 'transactions'),
                    where('userId', '==', user.uid),
                    where('installmentGroupId', '==', transaction.installmentGroupId));
                
                const querySnapshot = await getDocs(q);
                
                querySnapshot.forEach(doc => {
                    if (!doc.data().isPaid) {
                        batch.update(doc.ref, { isPaid: true });
                    }
                });
                
                await batch.commit();
            }
        } catch (error) {
            console.error("Erro ao processar pagamento de parcela:", error);
            alert("Erro ao salvar pagamento. Tente novamente.");
        }
    };
    
    const handleDeleteRequest = (id, type) => {
        if (type === 'transaction' && id.startsWith('fixed-')) { alert("Gastos fixos só podem ser removidos na seção 'Gastos Fixos'."); return; } 
        if (type === 'fixedExpense') { handleDeleteFixedExpense(id); return; } 
        let transactionData = null;
        if (type === 'transaction') { transactionData = transactions.find(t => t.id === id) || null; }
        setDeleteModalState({ isOpen: true, id, type, transactionData });
    };
    
    const handleConfirmDelete = async () => {
        const { id, type, transactionData } = deleteModalState; 
        if (!id || !type) return;

        const collectionName = type === 'transaction' ? 'transactions' : 'categories';
        const stateSetter = type ==='transaction' ? setTransactions : setCategories;
        const originalState = type === 'transaction' ? [...transactions] : [...categories];
        
        setDeleteModalState({ isOpen: false, id: null, type: null, transactionData: null }); 
        
        if (type === 'category') {
             const categoryToDelete = categories.find(c => c.id === id);
             if (categoryToDelete?.name.toLowerCase() === 'metas') {
                 alert("Não é possível excluir a categoria 'Metas', pois ela é essencial para a funcionalidade de Metas.");
                 return; 
             }
        }
        
        stateSetter(prev => prev.filter(item => item.id !== id));

        try {
            // CASO 1: É UMA EXCLUSÃO DE PARCELAMENTO (NOVO SISTEMA)
            if (type === 'transaction' && transactionData?.installmentGroupId) {
                const batch = writeBatch(db);
                const q = query(collection(db, 'transactions'), 
                            where('userId', '==', user.uid),
                            where('installmentGroupId', '==', transactionData.installmentGroupId));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
            // CASO 2: É UMA CONTRIBUIÇÃO DE META
            else if (type === 'transaction' && transactionData?.description?.startsWith('Contribuição para Meta:')) {
                const goalName = transactionData.description.replace('Contribuição para Meta: ', '').trim();
                const goalToUpdate = goals.find(g => g.goalName === goalName);
                const batch = writeBatch(db);
                const txRef = doc(db, 'transactions', id);
                batch.delete(txRef); 
                if (goalToUpdate) {
                    const goalRef = doc(db, 'goals', goalToUpdate.id);
                    batch.update(goalRef, { currentAmount: increment(-transactionData.amount) });
                }
                await batch.commit(); 
            }
            // CASO 3: É UMA EXCLUSÃO NORMAL (transação única, categoria)
            else {
                await deleteDoc(doc(db, collectionName, id));
            }
            
        } catch (error) {
            console.error(`Erro ao Deletar ${type}:`, error);
            stateSetter(originalState); 
            alert(`Erro ao excluir.`);
        }
    };
    
    const handleAddFixedExpense = async (expense) => {
        if (!user) return; try { await addDoc(collection(db, 'fixedExpenses'), { ...expense, userId: user.uid }); } catch (error) { console.error("Erro Adicionar Gasto Fixo:", error); }
    };
    const handleDeleteFixedExpense = (id) => {
        if (!user) return; setDeleteModalState({ isOpen: true, id: id, type: 'fixedExpense' });
    };
    const handleConfirmDeleteFixedExpense = async () => {
         const { id } = deleteModalState; if (!id || deleteModalState.type !== 'fixedExpense') return; const originalState = [...fixedExpenses]; setDeleteModalState({ isOpen: false, id: null, type: null }); setFixedExpenses(prev => prev.filter(item => item.id !== id)); try { await deleteDoc(doc(db, 'fixedExpenses', id)); } catch(error) { console.error("Erro Deletar Gasto Fixo:", error); setFixedExpenses(originalState); alert("Erro ao excluir gasto fixo."); }
    };
    const handleUpdateFixedExpense = async (updatedExpense) => {
        if (!user || !updatedExpense.id) return; try { const { id, ...dataToUpdate } = updatedExpense; await updateDoc(doc(db, 'fixedExpenses', id), dataToUpdate); setIsEditFixedExpenseModalOpen(false); setEditingFixedExpense(null); } catch (error) { console.error("Erro Atualizar Gasto Fixo:", error); alert("Não foi possível atualizar."); }
    };
    const handleSignOut = () => signOut(auth);
    const openEditTransactionModal = (transaction) => { setEditingTransaction(transaction); setIsEditTransactionModalOpen(true); };
    const openEditCategoryModal = (category) => { setEditingCategory(category); setIsEditCategoryModalOpen(true); };
    const openEditFixedExpenseModal = (expense) => { setEditingFixedExpense(expense); setIsEditFixedExpenseModalOpen(true); };
    const handleCardFilterAndScroll = (filterValue) => {
        const newFilter = typeFilterOptions.find(opt => opt.value === filterValue) || typeFilterOptions[0]; if (typeFilter.value === filterValue) { setTypeFilter(typeFilterOptions[0]); } else { setTypeFilter(newFilter); } transactionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const handleChartClick = (type) => { navigate('/report', { state: { reportType: type, reportMonth: currentMonth } }); };

    
    // --- Funções de Modal de Metas (Adicionar) ---
    const openAddFundsModal = (goal) => {
        setSelectedGoal(goal);
        setIsAddFundsModalOpen(true);
    };
    const closeAddFundsModal = () => {
        setSelectedGoal(null);
        setIsAddFundsModalOpen(false);
    };
    const handleAddFundsToGoal = async (goal, amount, paymentMethod) => {
        if (!user || !goal || amount <= 0 || !paymentMethod) {
            throw new Error("Dados inválidos para adicionar fundos.");
        }
        const metaCategory = categories.find(c => c.name.toLowerCase() === 'metas');
        if (!metaCategory) {
            throw new Error("Erro: Categoria 'Metas' não encontrada. Por favor, crie uma categoria chamada 'Metas' para registrar esta contribuição.");
        }
        const batch = writeBatch(db);
        const goalRef = doc(db, 'goals', goal.id);
        batch.update(goalRef, {
            currentAmount: increment(amount) 
        });
        const newTransactionRef = doc(collection(db, 'transactions'));
        const newTransactionData = {
            userId: user.uid,
            description: `Contribuição para Meta: ${goal.goalName}`,
            amount: amount,
            date: Timestamp.now(), 
            type: 'expense', 
            category: metaCategory.name, 
            paymentMethod: paymentMethod,
            isPaid: true, 
            isInstallment: false,
            installments: 1,
        };
        batch.set(newTransactionRef, newTransactionData);
        await batch.commit();
    };

    // --- Funções de Modal de Metas (Resgatar) ---
    const openWithdrawModal = (goal) => {
        setSelectedGoal(goal);
        setIsWithdrawModalOpen(true);
    };
    const closeWithdrawModal = () => {
        setSelectedGoal(null);
        setIsWithdrawModalOpen(false);
    };
    
    /** Função que Resgata Fundos (Subtrai da Meta + Cria Ganho) */
    const handleWithdrawFromGoal = async (goal, amount, paymentMethod) => {
        if (!user || !goal || amount <= 0 || amount > goal.currentAmount || !paymentMethod) {
            throw new Error("Dados inválidos para resgatar fundos.");
        }

        const metaCategory = categories.find(c => c.name.toLowerCase() === 'metas');
        if (!metaCategory) {
            throw new Error("Erro: Categoria 'Metas' não encontrada. Por favor, crie uma categoria chamada 'Metas' para registrar este resgate.");
        }

        const batch = writeBatch(db);
        
        const goalRef = doc(db, 'goals', goal.id);
        batch.update(goalRef, {
            currentAmount: increment(-amount) 
        });

        const newTransactionRef = doc(collection(db, 'transactions'));
        const newTransactionData = {
            userId: user.uid,
            description: `Resgate da Meta: ${goal.goalName}`,
            amount: amount,
            date: Timestamp.now(), 
            type: 'income', 
            category: metaCategory.name, 
            paymentMethod: paymentMethod, 
            isPaid: true, 
            isInstallment: false,
            installments: 1,
        };
        batch.set(newTransactionRef, newTransactionData);

        await batch.commit();
    };


    // --- LÓGICA PRINCIPAL E CÁLCULOS ---
    const allTransactionsForMonth = useMemo(() => {
        let monthTransactions = transactions.filter(t => new Date(t.date).getMonth() === currentMonth.getMonth() && new Date(t.date).getFullYear() === currentMonth.getFullYear());
        fixedExpenses.forEach(fixed => {
            const paidVersionExists = monthTransactions.some(t => !t.isFixed && t.isPaid && t.description.toLowerCase().includes(fixed.description.toLowerCase()) && new Date(t.date).getDate() === fixed.dayOfMonth);
            if (!paidVersionExists) {
                monthTransactions.push({
                    id: `fixed-${fixed.id}-${currentMonth.getFullYear()}-${currentMonth.getMonth()}`, description: fixed.description, amount: fixed.amount,
                    date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), fixed.dayOfMonth), type: 'expense', category: fixed.category, isPaid: false, isFixed: true,
                });
            }
        });
        return monthTransactions;
    }, [transactions, fixedExpenses, currentMonth]);
    const { incomeTotal, expensePaid, expenseToPay, balance } = useMemo(() => {
        let income = 0, paidExpense = 0, toPayExpense = 0; allTransactionsForMonth.forEach(t => { (t.type === 'income') ? income += t.amount : (t.isPaid ? paidExpense += t.amount : toPayExpense += t.amount); }); return { incomeTotal: income, expensePaid: paidExpense, expenseToPay: toPayExpense, balance: income - paidExpense };
    }, [allTransactionsForMonth]);
    const expenseChartData = useMemo(() => generateChartData(allTransactionsForMonth, 'expense', categories), [allTransactionsForMonth, categories]);
    const incomeChartData = useMemo(() => generateChartData(allTransactionsForMonth, 'income', categories), [allTransactionsForMonth, categories]);
    const categoryFilterOptions = useMemo(() => [ ...categories.map(cat => ({ value: cat.name, label: cat.name })).sort((a, b) => a.label.localeCompare(b.label)) ], [categories]);
    const transactionsForDisplay = useMemo(() => {
        let baseList; if (transactionViewTab === 'fixed') { baseList = allTransactionsForMonth.filter(t => t.isFixed); } else { baseList = allTransactionsForMonth.filter(t => !t.isFixed || (t.isFixed && t.isPaid)); } let filteredByType = baseList; switch (typeFilter.value) { case 'income': filteredByType = baseList.filter(t => t.type === 'income'); break; case 'paidExpense': filteredByType = baseList.filter(t => t.type === 'expense' && t.isPaid); break; case 'toPayExpense': filteredByType = baseList.filter(t => t.type === 'expense' && !t.isPaid); break; default: break; } const descLower = descriptionFilter.toLowerCase(); const selectedCategoryNames = categoryFilter ? categoryFilter.map(opt => opt.value.toLowerCase()) : []; return filteredByType.filter(t => { const descriptionMatch = t.description?.toLowerCase().includes(descLower) ?? true; const categoryMatch = selectedCategoryNames.length === 0 || selectedCategoryNames.includes(t.category?.toLowerCase()); return descriptionMatch && categoryMatch; });
    }, [typeFilter, transactionViewTab, allTransactionsForMonth, descriptionFilter, categoryFilter, categories]); 
    const expensesByCategory = useMemo(() => {
        const monthlyExpenses = allTransactionsForMonth.filter(t => t.type === 'expense'); return monthlyExpenses.reduce((acc, transaction) => { const categoryName = transaction.category || 'Outros'; acc[categoryName] = (acc[categoryName] || 0) + transaction.amount; return acc; }, {});
    }, [allTransactionsForMonth]); 


    if (loading) return <div>Carregando dados...</div>; 

    return (
        <>
            <ConfirmationModal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState({ isOpen: false, id: null, type: null, transactionData: null })} onConfirm={deleteModalState.type === 'fixedExpense' ? handleConfirmDeleteFixedExpense : handleConfirmDelete} message="Esta ação é permanente..." />
            <EditTransactionModal isOpen={isEditTransactionModalOpen} onClose={() => { setIsEditTransactionModalOpen(false); setEditingTransaction(null); }} transaction={editingTransaction} categories={categories} onSave={handleUpdateTransaction} />
            <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => { setIsEditCategoryModalOpen(false); setEditingCategory(null); }} category={editingCategory} onSave={handleUpdateCategory} />
            <EditFixedExpenseModal isOpen={isEditFixedExpenseModalOpen} onClose={() => { setIsEditFixedExpenseModalOpen(false); setEditingFixedExpense(null); }} expense={editingFixedExpense} categories={categories} onSave={handleUpdateFixedExpense} />
            
            <AddFundsToGoalModal 
                isOpen={isAddFundsModalOpen}
                onClose={closeAddFundsModal}
                goal={selectedGoal}
                categories={categories} 
                onSave={handleAddFundsToGoal}
            />
            
            <WithdrawFromGoalModal 
                isOpen={isWithdrawModalOpen}
                onClose={closeWithdrawModal}
                goal={selectedGoal}
                categories={categories} 
                onSave={handleWithdrawFromGoal}
            />

            <ActionModal
                isOpen={paymentActionModal.isOpen}
                onClose={() => setPaymentActionModal({ isOpen: false, transaction: null })}
                title="Confirmar Pagamento de Parcela"
                message={`Você está pagando: "${paymentActionModal.transaction?.description || 'parcela'}". Como deseja continuar?`}
                actions={[
                    {
                        label: 'Pagar somente esta',
                        onClick: () => handlePaymentAction('single', paymentActionModal.transaction),
                        className: 'confirm', 
                        style: { backgroundColor: 'var(--primary-color)' } 
                    },
                    {
                        label: 'Quitar (Pagar todas)',
                        onClick: () => handlePaymentAction('all', paymentActionModal.transaction),
                        className: 'confirm', 
                        style: { backgroundColor: 'var(--income-color)' } 
                    },
                    {
                        label: 'Cancelar',
                        onClick: () => setPaymentActionModal({ isOpen: false, transaction: null }),
                        className: 'cancel' 
                    }
                ]}
            />

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
                        <SummaryCard title="Ganhos do Mês" value={incomeTotal} type="income" onClick={() => handleCardFilterAndScroll('income')} isActive={typeFilter.value === 'income'} data-tooltip="Filtrar lista: Mostrar apenas Ganhos do Mês" />
                        <SummaryCard title="Despesas Pagas" value={expensePaid} type="expense" onClick={() => handleCardFilterAndScroll('paidExpense')} isActive={typeFilter.value === 'paidExpense'} data-tooltip="Filtrar lista: Mostrar apenas Despesas Pagas" />
                        <SummaryCard title="Despesas a Pagar" value={expenseToPay} type="expense" onClick={() => handleCardFilterAndScroll('toPayExpense')} isActive={typeFilter.value === 'toPayExpense'} data-tooltip="Filtrar lista: Mostrar apenas Despesas a Pagar" />
                        <SummaryCard title="Saldo (Ganhos - Pagos)" value={balance} type="balance" data-tooltip="Saldo do Mês (Ganhos - Despesas Pagas)" />
                    </div>
                    <div className="main-layout">
                        <div className="sidebar">
                            <div className="sidebar-tabs">
                                <button className={`sidebar-tab-button ${sidebarTab === 'transaction' ? 'active' : ''}`} onClick={() => setSidebarTab('transaction')}> Transação </button>
                                <button className={`sidebar-tab-button ${sidebarTab === 'fixed' ? 'active' : ''}`} onClick={() => setSidebarTab('fixed')}> Fixos </button>
                                <button className={`sidebar-tab-button ${sidebarTab === 'budget' ? 'active' : ''}`} onClick={() => setSidebarTab('budget')}> Orçamentos </button>
                                <button className={`sidebar-tab-button ${sidebarTab === 'goal' ? 'active' : ''}`} onClick={() => setSidebarTab('goal')}> Metas </button>
                            </div>
                            
                            <div className="sidebar-content-container">
                                {sidebarTab === 'transaction' && ( <TransactionForm categories={categories} onAddTransaction={handleAddTransaction} type={formType} setType={setFormType} /> )}
                                {sidebarTab === 'fixed' && ( <FixedExpensesManager categories={categories} onAddFixedExpense={handleAddFixedExpense} fixedExpenses={fixedExpenses} onDeleteFixedExpense={handleDeleteFixedExpense} onEditFixedExpense={openEditFixedExpenseModal} /> )}
                                {sidebarTab === 'budget' && ( <BudgetManager categories={categories} currentMonth={currentMonth} /> )}
                                {sidebarTab === 'goal' && ( <GoalManager /> )} 
                            </div>

                            <CategoryManager categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={(id) => handleDeleteRequest(id, 'category')} onEditCategory={openEditCategoryModal} />
                            <BudgetProgressList budgets={budgets} expensesByCategory={expensesByCategory} />
                            
                            <GoalProgressList 
                                goals={goals} 
                                onAddFundsClick={openAddFundsModal} 
                                onWithdrawFundsClick={openWithdrawModal}
                            /> 
                        
                        </div> {/* Fim da Sidebar */}

                        <div className="content">
                            <div className="charts-grid">
                                <div className="chart-item" onClick={() => handleChartClick('income')} style={{ cursor: 'pointer' }} data-tooltip="Ir para página de relatório de ganhos">
                                    <h4>Ganhos por Categoria</h4>
                                    {incomeChartData.length > 0 ? ( <ResponsiveContainer width="100%" height={250}> <PieChart> <Pie data={incomeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}> {incomeChartData.map((entry) => <Cell key={`cell-income-${entry.name}`} fill={entry.color} />)} </Pie> <Tooltip content={<CustomTooltip />} /> </PieChart> </ResponsiveContainer> ) : <p className="empty-message">Nenhum ganho neste mês.</p>}
                                </div>
                                <div className="chart-item" onClick={() => handleChartClick('expense')} style={{ cursor: 'pointer' }} data-tooltip="Ir para página de relatório de gastos">
                                    <h4>Gastos por Categoria</h4>
                                    {expenseChartData.length > 0 ? ( <ResponsiveContainer width="100%" height={250}> <PieChart> <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}> {expenseChartData.map((entry) => <Cell key={`cell-expense-${entry.name}`} fill={entry.color} />)} </Pie> <Tooltip content={<CustomTooltip />} /> </PieChart> </ResponsiveContainer> ) : <p className="empty-message">Nenhum gasto neste mês.</p>}
                                </div>
                            </div>

                            <div className="transaction-view-tabs">
                                <button className={`tab-button ${transactionViewTab === 'monthly' ? 'active' : ''}`} onClick={() => setTransactionViewTab('monthly')}> Transações do Mês </button>
                                <button className={`tab-button ${transactionViewTab === 'fixed' ? 'active' : ''}`} onClick={() => setTransactionViewTab('fixed')}> Gastos Fixos Previstos </button>
                            </div>

                            <div className="list-container" ref={transactionListRef}>
                                <div className="list-container-header">
                                    <h3>{transactionViewTab === 'monthly' ? 'Transações do Mês' : 'Gastos Fixos Previstos'}</h3>
                                    <div className="transaction-list-filters">
                                        <input type="text" placeholder="🔍 Filtrar por descrição..." value={descriptionFilter} onChange={(e) => setDescriptionFilter(e.target.value)} className="filter-input description-filter" />
                                        <Select options={typeFilterOptions} value={typeFilter} onChange={setTypeFilter} className="filter-input type-filter" classNamePrefix="react-select" />
                                        <Select options={categoryFilterOptions} value={categoryFilter} onChange={setCategoryFilter} placeholder="Categoria(s)..." isClearable={true} isMulti closeMenuOnSelect={false} hideSelectedOptions={false} controlShouldRenderValue={false} className="filter-input category-filter" classNamePrefix="react-select" />
                                    </div>
                                </div>
                                    <TransactionList transactions={transactionsForDisplay} categories={categories} onDeleteTransaction={(id, type) => handleDeleteRequest(id, type)} onEditTransaction={openEditTransactionModal} onTogglePaid={handleTogglePaidStatus} />
                            </div>
                        </div> {/* Fim do Content */}
                    </div> {/* Fim do Main Layout */}
                </main>
            </div>
        </>
    );
};

export default Dashboard;