import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useTransactions = (user, currentMonth) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user || !currentMonth) {
            setTransactions([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const startDate = new Date(year, month, 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(year, month + 1, 0);
        endDate.setHours(23, 59, 59, 999);

        try {
            const q = query(
                collection(db, 'transactions'),
                where('userId', '==', user.uid)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const docs = snapshot.docs.map(doc => {
                    const data = doc.data();
                    let dateObj = new Date();
                    if (data.date && typeof data.date.toDate === 'function') {
                        dateObj = data.date.toDate();
                    } else if (data.date) {
                        dateObj = new Date(data.date);
                    }

                    return {
                        id: doc.id,
                        ...data,
                        date: dateObj
                    };
                });

                const filteredTransactions = docs.filter(t => {
                    return t.date >= startDate && t.date <= endDate;
                });

                filteredTransactions.sort((a, b) => b.date - a.date);

                setTransactions(filteredTransactions);
                setLoading(false);
            }, (err) => {
                console.error("Erro useTransactions:", err);
                setError(err);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err) {
            console.error("Erro setup useTransactions:", err);
            setError(err);
            setLoading(false);
        }

    }, [user, currentMonth]);

    return { transactions, loading, error };
};