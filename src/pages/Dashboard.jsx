import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js';

import SummaryCard from '../components/SummaryCard.jsx';
import MonthNavigator from '../components/MonthNavigator.jsx';
import CategoryManager from '../components/CategoryManager.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import TransactionList from '../components/TransactionList.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

const COLORS = ['#6a82fb', '#27ae60', '#e74c3c', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e'];

// Componente para o Tooltip Personalizado do Gráfico
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const totalExpense = payload.reduce((sum, entry) => sum + entry.value, 0); // Soma do valor total no tooltip
    const percent = totalExpense > 0 ? (data.value / totalExpense) * 100 : 0; // Calcula percentual corretamente

    return (
      <div className="custom-tooltip">
        <p className="label">{`${data.name}`}</p>
        <p className="value">{`Valor: ${data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
        {/* Mostra percentual baseado no total visível no gráfico */}
        <p className="percent">{`Percentual: ${percent.toFixed(1)}%`}</p>
      </div>
    );
  }
  return null;
};


const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState({ isOpen: false, id: null, type: null });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser || null);
            setLoading(false);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) {
            setTransactions([]); setCategories([]); return;
        }

        setLoading(true);
        const catQuery = query(collection(db, 'categories'), where('userId', '==', user.uid));
        const unsubCategories = onSnapshot(catQuery, (snapshot) => {
            setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            console.error("Erro ao buscar categorias:", error); // Adiciona log de erro
            setLoading(false); // Garante que o loading termine mesmo com erro
        });

        const transQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const unsubTransactions = onSnapshot(transQuery, (snapshot) => {
            setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })));
            setLoading(false);
        }, (error) => {
             console.error("Erro ao buscar transações:", error);
             setLoading(false);
        });


        return () => { unsubCategories(); unsubTransactions(); };
    }, [user]);

    const handleAddTransaction = async (transaction) => {
        if (!user) return;
        const { isInstallment, installments, ...rest } = transaction;
        try {
            if (isInstallment && transaction.type === 'expense') {
                const installmentAmount = transaction.amount / installments;
                for (let i = 0; i < installments; i++) {
                    const installmentDate = new Date(transaction.date);
                    installmentDate.setMonth(installmentDate.getMonth() + i);
                    await addDoc(collection(db, 'transactions'), {
                        ...rest, userId: user.uid, amount: installmentAmount,
                        description: `${transaction.description} (${i + 1}/${installments})`,
                        date: Timestamp.fromDate(installmentDate),
                    });
                }
            } else {
                await addDoc(collection(db, 'transactions'), { ...rest, userId: user.uid, date: Timestamp.fromDate(transaction.date) });
            }
        } catch (error) { console.error("Erro ao adicionar transação:", error); }
    };

    const handleAddCategory = async (category) => {
        if (!user) return;
        try { await addDoc(collection(db, 'categories'), { ...category, userId: user.uid }); }
        catch (error) { console.error("Erro ao adicionar categoria:", error); }
    };

    const handleDeleteRequest = (id, type) => {
        setModalState({ isOpen: true, id, type });
    };

    const handleConfirmDelete = async () => {
        const { id, type } = modalState;
        if (!id || !type) return;
        try {
            if (type === 'transaction') {
                await deleteDoc(doc(db, 'transactions', id));
            } else if (type === 'category') {
                // Adicional: Verificar se a categoria está em uso antes de excluir? (Opcional)
                await deleteDoc(doc(db, 'categories', id));
            }
        } catch (error) { console.error("Erro ao deletar:", error); }
        setModalState({ isOpen: false, id: null, type: null });
    };

    const handleSignOut = () => signOut(auth);

    const filteredTransactions = useMemo(() => transactions.filter(t => new Date(t.date).getMonth() === currentMonth.getMonth() && new Date(t.date).getFullYear() === currentMonth.getFullYear()), [transactions, currentMonth]);
    const { income, expense, balance } = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [filteredTransactions]);
    const chartData = useMemo(() => Object.entries(filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {})).map(([name, value]) => ({ name, value })), [filteredTransactions]);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2rem', color: '#6c757d' }}>Carregando dados...</div>;

    return (
        <>
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false, id: null, type: null })}
                onConfirm={handleConfirmDelete}
                message="Esta ação é permanente. Deseja realmente excluir este item?"
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
                        <SummaryCard title="Ganhos do Mês" value={income} type="income" />
                        <SummaryCard title="Despesas do Mês" value={expense} type="expense" />
                        <SummaryCard title="Saldo do Mês" value={balance} type="balance" />
                    </div>
                    <div className="main-layout">
                        <div className="sidebar">
                            <TransactionForm categories={categories} onAddTransaction={handleAddTransaction} />
                            <CategoryManager categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={(id) => handleDeleteRequest(id, 'category')} />
                        </div>
                        <div className="content">
                            <div className="charts-container">
                                <h3>Gastos por Categoria</h3>
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                              data={chartData}
                                              dataKey="value"
                                              nameKey="name"
                                              cx="50%"
                                              cy="50%"
                                              outerRadius={100}
                                              labelLine={false}
                                              // Label customizada para mostrar nome e percentual
                                              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                const percentValue = (percent * 100).toFixed(0);
                                                // Não mostra label para fatias muito pequenas
                                                if (percentValue < 5) return null;
                                                return (
                                                  <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px" fontWeight="500">
                                                    {`${chartData[index].name} ${percentValue}%`}
                                                  </text>
                                                );
                                              }}
                                            >
                                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <p className="empty-message">Nenhuma despesa para exibir no gráfico.</p>}
                            </div>
                            <TransactionList transactions={filteredTransactions} categories={categories} onDeleteTransaction={(id) => handleDeleteRequest(id, 'transaction')} />
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default Dashboard;