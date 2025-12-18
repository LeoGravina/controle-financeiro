import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Função auxiliar para criar categorias padrão (extraída do componente)
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

export const useFinancialData = (user, currentMonth) => {
    const [categories, setCategories] = useState([]);
    const [fixedExpenses, setFixedExpenses] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setCategories([]);
            setFixedExpenses([]);
            setBudgets([]);
            setGoals([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        let listenersActive = true;

        // 1. Listener de Categorias
        const unsubCategories = onSnapshot(query(collection(db, 'categories'), where('userId', '==', user.uid)), async (snap) => {
            if (!listenersActive) return;
            if (snap.empty) {
                await createDefaultCategories(user.uid);
            } else {
                setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        });

        // 2. Listener de Despesas Fixas
        const unsubFixedExpenses = onSnapshot(query(collection(db, 'fixedExpenses'), where('userId', '==', user.uid)), (snap) => {
            if (listenersActive) setFixedExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 3. Listener de Orçamentos (Depende do Mês Atual)
        const month = currentMonth.getMonth();
        const year = currentMonth.getFullYear();
        const budgetQuery = query(collection(db, 'budgets'), where('userId', '==', user.uid), where('month', '==', month), where('year', '==', year));
        const unsubBudgets = onSnapshot(budgetQuery, (snap) => {
            if (listenersActive) setBudgets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // 4. Listener de Metas
        const goalsQuery = query(collection(db, 'goals'), where('userId', '==', user.uid));
        const unsubGoals = onSnapshot(goalsQuery, (snap) => {
            if (listenersActive) {
                const fetchedGoals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedGoals.sort((a, b) => a.goalName.localeCompare(b.goalName));
                setGoals(fetchedGoals);
                // Quando todos os listeners inicializarem, removemos o loading
                setLoading(false);
            }
        });

        return () => {
            listenersActive = false;
            unsubCategories();
            unsubFixedExpenses();
            unsubBudgets();
            unsubGoals();
        };
    }, [user, currentMonth]);

    return { categories, fixedExpenses, budgets, goals, loading };
};