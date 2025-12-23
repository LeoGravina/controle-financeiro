// src/contexts/FinanceContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import * as transactionService from '../services/TransactionService';

const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Monitorar Autenticação
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setLoading(false);
        });
        return () => unsubAuth();
    }, []);

    // 2. Monitorar Categorias
    useEffect(() => {
        if (!user) {
            setCategories([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'categories'), where('userId', '==', user.uid));
        const unsub = onSnapshot(q, (snap) => {
            setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Erro ao carregar categorias", error);
            toast.error("Erro ao carregar categorias.");
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    // --- AÇÕES GLOBAIS COM TOAST ---

    // Transações
    const addTransaction = async (transactionData) => {
        if (!user) return;
        try {
            if (transactionData.isInstallment && transactionData.installments > 1) {
                await transactionService.createInstallmentTransaction(user.uid, transactionData);
                toast.success("Compra parcelada registrada!");
            } else {
                await transactionService.createTransaction(user.uid, transactionData);
                toast.success("Transação adicionada!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar transação.");
            throw error;
        }
    };

    const removeTransaction = async (id, transactionData) => {
        if (!user) return;
        try {
            if (transactionData && transactionData.installmentGroupId) {
                await transactionService.deleteInstallmentGroup(user.uid, transactionData.installmentGroupId);
                toast.success("Parcelas removidas com sucesso!");
            } else {
                await transactionService.deleteTransaction(id);
                toast.success("Transação removida!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir.");
        }
    };

    const editTransaction = async (updatedData) => {
        if (!user) return;
        try {
            if (updatedData.installmentGroupId && updatedData.updateAllInstallments) {
                 await transactionService.updateInstallmentGroup(user.uid, updatedData.installmentGroupId, updatedData);
                 toast.success("Grupo atualizado!");
            } else {
                const { id, ...rest } = updatedData;
                await transactionService.updateTransaction(id, rest);
                toast.success("Transação atualizada!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar.");
        }
    };

    const togglePaid = async (transaction) => {
        try {
            await transactionService.toggleTransactionPaid(transaction.id, transaction.isPaid);
            // Sem toast aqui para ser rápido, ou coloque um bem discreto se quiser
        } catch (error) {
            console.error(error);
            toast.error("Erro ao mudar status.");
        }
    };

    // --- CATEGORIAS (NOVO) ---
    const addCategory = async (categoryData) => {
        if (!user) return;
        try {
            await addDoc(collection(db, 'categories'), { ...categoryData, userId: user.uid });
            toast.success("Categoria criada!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao criar categoria.");
        }
    };

    const updateCategory = async (updatedCategory) => {
        if (!user || !updatedCategory.id) return;
        
        // Verifica duplicidade de nome (exceto a própria)
        const existing = categories.find(c => 
            c.name.toLowerCase() === updatedCategory.name.toLowerCase() && 
            c.id !== updatedCategory.id
        );

        if (existing) {
            toast.warning("Já existe uma categoria com este nome.");
            return;
        }

        const oldCategory = categories.find(c => c.id === updatedCategory.id);
        const oldName = oldCategory ? oldCategory.name : null;
        const newName = updatedCategory.name.trim();

        try {
            // Se mudou apenas a cor, update simples
            if (!oldName || oldName === newName) {
                await updateDoc(doc(db, 'categories', updatedCategory.id), { color: updatedCategory.color });
                toast.success("Categoria atualizada com sucesso!");
                return; 
            }

            // Se mudou o nome, precisamos atualizar TUDO que usa esse nome (Transações, Orçamentos, etc)
            const batch = writeBatch(db);
            
            // 1. Atualiza a Categoria
            batch.update(doc(db, 'categories', updatedCategory.id), { name: newName, color: updatedCategory.color });
            
            // 2. Busca e atualiza transações antigas
            const qTransactions = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('category', '==', oldName));
            const qBudgets = query(collection(db, 'budgets'), where('userId', '==', user.uid), where('categoryName', '==', oldName));
            
            const [transactionsSnapshot, budgetsSnapshot] = await Promise.all([ getDocs(qTransactions), getDocs(qBudgets) ]);
            
            transactionsSnapshot.forEach((doc) => { batch.update(doc.ref, { category: newName }); });
            budgetsSnapshot.forEach((doc) => { batch.update(doc.ref, { categoryName: newName }); });
            
            await batch.commit();
            toast.success("Categoria e registros atualizados com sucesso!");

        } catch (error) {
            console.error("Erro update full:", error);
            toast.error("Erro ao atualizar categoria.");
        }
    };

    const deleteCategory = async (id) => {
        if (!user) return;
        const categoryToDelete = categories.find(c => c.id === id);
        if (categoryToDelete?.name.toLowerCase() === 'metas') { 
            toast.warning("A categoria 'Metas' é protegida e não pode ser excluída."); 
            return; 
        }

        try {
            await deleteDoc(doc(db, 'categories', id));
            toast.success("Categoria excluída com sucesso.");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir categoria.");
        }
    };

    return (
        <FinanceContext.Provider value={{ 
            user, 
            categories, 
            loading,
            addTransaction,
            removeTransaction,
            editTransaction,
            togglePaid,
            addCategory,     
            updateCategory,  
            deleteCategory   
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error("useFinance deve ser usado dentro de um FinanceProvider");
    }
    return context;
};