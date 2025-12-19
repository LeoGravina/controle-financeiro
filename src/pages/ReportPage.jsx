import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore'; 
import { auth, db } from '../firebase/config';
import Select from 'react-select'; 
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
    LineChart, Line 
} from 'recharts';
import { FaArrowLeft, FaSyncAlt, FaFilePdf, FaCalendarAlt, FaArrowDown, FaArrowUp } from 'react-icons/fa'; 
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import TransactionList from '../components/TransactionList';
import BudgetProgressList from '../components/BudgetProgressList';
import GoalProgressList from '../components/GoalProgressList';

// --- COMPONENTES AUXILIARES (DEFINIDOS FORA PARA EVITAR RE-RENDER) ---

const CustomTooltip = ({ active, payload, label }) => { 
    if (active && payload && payload.length) {
        const dataPoint = payload[0]; 
        
        // CORREÇÃO: Pega o nome da categoria direto do payload para não exibir "value"
        const name = dataPoint.payload.name || label; 
        
        const data = dataPoint;
        const percentValue = data.payload.percent;

        return (
            <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <p className="label" style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>{`${name}`}</p>
                <p className="value" style={{ margin: 0, color: '#6a82fb', fontWeight: '500' }}>
                    {`Valor: ${data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                </p>
                {percentValue !== undefined && (
                    <p className="percent" style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.85em' }}>
                        {`Representatividade: ${(percentValue * 100).toFixed(1)}%`}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

// Componente de Seção Otimizado (React.memo)
const ReportSection = React.memo(({ title, typeColor, chartData, listData, isPdfMode, categories }) => (
    <div className="report-section-block">
        <div className="report-section-divider">
            <div className="report-section-title">
                {typeColor === 'var(--income-color)' ? <FaArrowUp color={typeColor} /> : <FaArrowDown color={typeColor} />}
                <span style={{color: typeColor}}>{title}</span>
            </div>
        </div>

        <div className="report-charts-grid">
            <div className="card-style">
                <h3>Distribuição</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie 
                            data={chartData} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={80} 
                            label={({percent}) => `${(percent*100).toFixed(0)}%`}
                        >
                            {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="card-style">
                <h3>Por Categoria</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} layout="vertical" margin={{left: 40, right: 40}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                        
                        {/* CORREÇÃO: cursor={{ fill: 'transparent' }} remove a barra cinza de fundo */}
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        
                        <Bar dataKey="value" barSize={20} radius={[0,4,4,0]}>
                            <LabelList dataKey="value" position="right" formatter={(val) => `R$ ${val}`} style={{fontSize: '11px', fill: '#666'}} />
                            {chartData.map((e,i) => <Cell key={i} fill={e.color} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Lista apenas para PDF (Fixa e Completa) */}
        {isPdfMode && (
            <div className="report-list-wrapper">
                <h3>Listagem Completa ({title})</h3>
                <div className="list-container" style={{boxShadow: 'none', padding: 0}}>
                    <TransactionList 
                        transactions={listData} 
                        categories={categories} 
                        onDeleteTransaction={() => {}} 
                        onEditTransaction={() => {}} 
                        onTogglePaid={() => {}} 
                        isReadOnly={true} 
                    />
                    {listData.length === 0 && <p style={{color: '#999', padding: '10px'}}>Nenhum registro encontrado.</p>}
                </div>
            </div>
        )}
    </div>
));

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
        }).sort((a, b) => b.value - a.value); 
};

// --- COMPONENTE PRINCIPAL ---

const ReportPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    
    // Dados
    const [transactions, setTransactions] = useState([]); 
    const [previousMonthTransactions, setPreviousMonthTransactions] = useState([]); 
    const [categories, setCategories] = useState([]);
    const [fixedExpenses, setFixedExpenses] = useState([]); 
    const [budgets, setBudgets] = useState([]);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Controles de Tela
    const [reportType, setReportType] = useState(null); 
    const [reportMonth, setReportMonth] = useState(null); 
    const [isPdfMode, setIsPdfMode] = useState(false); 
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); 

    // Filtros visuais (Tela)
    const [screenFilterText, setScreenFilterText] = useState('');
    const [screenCategoryFilter, setScreenCategoryFilter] = useState(null);

    useEffect(() => { window.scrollTo(0, 0); }, []); 
    
    useEffect(() => {
        if (location.state && location.state.reportType && location.state.reportMonth) {
            setReportType(location.state.reportType);
            const monthDate = new Date(location.state.reportMonth);
            monthDate.setDate(1); monthDate.setHours(0,0,0,0);
            setReportMonth(monthDate);
        } else { navigate('/'); }
    }, [location, navigate]);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, currentUser => setUser(currentUser || null));
        return () => unsubAuth();
    }, []);
    
    // --- CARREGAMENTO DE DADOS ---
    useEffect(() => { 
        if (!user || !reportMonth) { setLoading(false); return; }
        setLoading(true); 
        let listenersActive = true;

        const qCat = query(collection(db, 'categories'), where('userId', '==', user.uid));
        const unsubCat = onSnapshot(qCat, snap => { if(listenersActive) setCategories(snap.docs.map(d=>({id:d.id, ...d.data()}))); });
        
        const qFix = query(collection(db, 'fixedExpenses'), where('userId', '==', user.uid));
        const unsubFix = onSnapshot(qFix, snap => { if(listenersActive) setFixedExpenses(snap.docs.map(d=>({id:d.id, ...d.data()}))); });
        
        const fetchTrans = async () => {
            const currentStart = Timestamp.fromDate(reportMonth);
            const nextMonth = new Date(reportMonth); nextMonth.setMonth(nextMonth.getMonth() + 1);
            const currentEnd = Timestamp.fromDate(nextMonth);
            const prevMonth = new Date(reportMonth); prevMonth.setMonth(prevMonth.getMonth() - 1);
            const prevStart = Timestamp.fromDate(prevMonth);
            
            const qCurr = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('date', '>=', currentStart), where('date', '<', currentEnd));
            const qPrev = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('date', '>=', prevStart), where('date', '<', currentStart));
            
            const [snapC, snapP] = await Promise.all([getDocs(qCurr), getDocs(qPrev)]);
            if (listenersActive) {
                setTransactions(snapC.docs.map(d => ({id: d.id, ...d.data(), date: d.data().date.toDate()})));
                setPreviousMonthTransactions(snapP.docs.map(d => ({id: d.id, ...d.data(), date: d.data().date.toDate()})));
                setLoading(false);
            }
        };
        fetchTrans();
        
        const qBud = query(collection(db, 'budgets'), where('userId', '==', user.uid), where('month', '==', reportMonth.getMonth()), where('year', '==', reportMonth.getFullYear()));
        const unsubBud = onSnapshot(qBud, s => { if(listenersActive) setBudgets(s.docs.map(d=>({id:d.id, ...d.data()}))); });
        const qGoals = query(collection(db, 'goals'), where('userId', '==', user.uid));
        const unsubGoals = onSnapshot(qGoals, s => { if(listenersActive) setGoals(s.docs.map(d=>({id:d.id, ...d.data()}))); });

        return () => { listenersActive = false; unsubCat(); unsubFix(); unsubBud(); unsubGoals(); };
    }, [user, reportMonth]); 

    // --- CÁLCULOS ---
    const allTransactionsForMonth = useMemo(() => {
        if (!reportMonth) return [];
        const month = reportMonth.getMonth(); const year = reportMonth.getFullYear();
        let monthTransactions = [...transactions]; 
        fixedExpenses.forEach(fixed => { 
             const paidVersionExists = monthTransactions.some(t => !t.isFixed && t.isPaid && t.description.toLowerCase().includes(fixed.description.toLowerCase()) && new Date(t.date).getDate() === fixed.dayOfMonth);
            if (!paidVersionExists) { 
                monthTransactions.push({ id: `fixed-${fixed.id}-${year}-${month}`, description: fixed.description, amount: fixed.amount, date: new Date(year, month, fixed.dayOfMonth), type: 'expense', category: fixed.category, isPaid: false, isFixed: true });
            }
         });
        return monthTransactions;
    }, [transactions, fixedExpenses, reportMonth]); 

    const { totalIncome, totalExpense } = useMemo(() => {
        let i = 0, e = 0; allTransactionsForMonth.forEach(t => t.type === 'income' ? i += t.amount : e += t.amount);
        return { totalIncome: i, totalExpense: e };
    }, [allTransactionsForMonth]);

    const incomeTransactions = useMemo(() => allTransactionsForMonth.filter(t => t.type === 'income').sort((a,b) => b.amount - a.amount), [allTransactionsForMonth]);
    const expenseTransactions = useMemo(() => allTransactionsForMonth.filter(t => t.type === 'expense').sort((a,b) => b.amount - a.amount), [allTransactionsForMonth]);
    
    const incomeChartData = useMemo(() => generateChartData(allTransactionsForMonth, 'income', categories), [allTransactionsForMonth, categories]);
    const expenseChartData = useMemo(() => generateChartData(allTransactionsForMonth, 'expense', categories), [allTransactionsForMonth, categories]);
    
    const expensesByCategory = useMemo(() => {
        return allTransactionsForMonth.filter(t => t.type === 'expense').reduce((acc, t) => { 
            const cat = t.category || 'Outros'; acc[cat] = (acc[cat] || 0) + t.amount; return acc; 
        }, {});
    }, [allTransactionsForMonth]); 

    const categoryOptions = useMemo(() => categories.map(c => ({ value: c.name, label: c.name })), [categories]);

    // Transações da Tela (Com Filtros) - Otimizado
    const screenTransactions = useMemo(() => {
        if (!reportType) return [];
        let list = allTransactionsForMonth.filter(t => t.type === reportType);
        if (screenFilterText) {
            list = list.filter(t => t.description.toLowerCase().includes(screenFilterText.toLowerCase()));
        }
        if (screenCategoryFilter && screenCategoryFilter.length > 0) {
            const selectedCats = screenCategoryFilter.map(c => c.value);
            list = list.filter(t => selectedCats.includes(t.category));
        }
        return list.sort((a, b) => b.amount - a.amount);
    }, [allTransactionsForMonth, reportType, screenFilterText, screenCategoryFilter]);

    // --- PAGINAÇÃO INTELIGENTE (SMART PAGE BREAK) ---
    const prepareLayoutForPrint = (inputElement) => {
        const contentWidth = inputElement.offsetWidth;
        const pageHeightInPixels = contentWidth * 1.414; // A4 Ratio
        
        const elements = inputElement.querySelectorAll(`
            .report-document-header, 
            .report-summary-cards-container, 
            .report-section-title,
            .report-charts-grid,
            .report-list-wrapper h3,
            .list-container li, 
            .report-widgets-grid,
            .report-footer-print
        `);

        let currentPageHeight = 0;
        const marginBuffer = 30; 

        elements.forEach((el) => {
            const elHeight = el.offsetHeight;
            // Pega margens computadas
            const style = window.getComputedStyle(el);
            const marginTop = parseFloat(style.marginTop) || 0;
            const marginBottom = parseFloat(style.marginBottom) || 0;
            const totalElHeight = elHeight + marginTop + marginBottom;

            if ((currentPageHeight + totalElHeight) > (pageHeightInPixels - marginBuffer)) {
                // Empurra para a próxima página
                const spacerHeight = pageHeightInPixels - currentPageHeight;
                el.style.marginTop = `${spacerHeight + 30}px`; 
                currentPageHeight = totalElHeight + 30; 
            } else {
                currentPageHeight += totalElHeight;
            }
        });
    };

    const clearLayoutStyles = (inputElement) => {
        const elements = inputElement.querySelectorAll('*');
        elements.forEach((el) => { el.style.marginTop = ''; });
    };

    // --- GERAÇÃO DE PDF ---
    const generatePDF = async () => {
        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        setIsPdfMode(true); 

        // Delay para renderização dos gráficos
        setTimeout(async () => {
            const input = document.getElementById('report-print-area');
            if (input) {
                try {
                    prepareLayoutForPrint(input);

                    const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                    
                    clearLayoutStyles(input); // Limpa tela imediatamente

                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    
                    const imgWidth = 210; 
                    const pageHeight = 297; 
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    
                    let heightLeft = imgHeight;
                    let position = 0;

                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;

                    while (heightLeft > 0) {
                        position = heightLeft - imgHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                        heightLeft -= pageHeight;
                    }

                    pdf.save(`Relatorio_${reportMonth.toLocaleDateString('pt-BR', {month:'long'})}.pdf`);

                } catch (err) {
                    console.error("Erro PDF", err);
                    alert("Erro ao gerar PDF.");
                    clearLayoutStyles(input);
                }
            }
            setIsPdfMode(false); 
            setIsGeneratingPdf(false);
        }, 2000); 
    };

    const handleSwitchReportType = () => {
        const opposite = reportType === 'income' ? 'expense' : 'income';
        setReportType(opposite);
        navigate('/report', { replace: true, state: { reportType: opposite, reportMonth } });
    };

    if (loading || !reportMonth) return <div>Carregando...</div>;

    const monthName = reportMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const isShowingIncome = reportType === 'income';

    return (
        <div className="dashboard-container report-container-wrapper">
            
            <div className="report-actions-bar">
                <button onClick={() => navigate('/')} className="signout-button"> <FaArrowLeft /> Voltar </button>
                <div className="report-main-actions">
                    <button onClick={handleSwitchReportType} className={`report-switch-button ${isShowingIncome ? 'btn-red' : 'btn-green'}`}>
                        <FaSyncAlt /> {isShowingIncome ? 'Ver Despesas' : 'Ver Recebimentos'}
                    </button>
                    <button onClick={generatePDF} disabled={isGeneratingPdf} className="pdf-button">
                        <FaFilePdf style={{marginRight: 8}}/> {isGeneratingPdf ? 'Gerando Relatório...' : 'Baixar Relatório Completo (PDF)'}
                    </button>
                </div>
            </div>

            <div id="report-print-area" className="report-print-area">
                <header className="report-document-header">
                    <div className="report-header-left">
                        <h1>Relatório Financeiro</h1>
                        <div className="report-date-badge"><FaCalendarAlt /> {monthName}</div>
                    </div>
                    <div className="report-header-right">
                        <p>Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </header>

                <div className="report-summary-cards-container">
                    <div className="report-summary-card income">
                        <span>Total Recebido</span>
                        <strong>{totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </div>
                    <div className="report-summary-card expense">
                        <span>Total Gasto</span>
                        <strong>{totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </div>
                    <div className={`report-summary-card balance ${totalIncome - totalExpense >= 0 ? 'positive' : 'negative'}`}>
                        <span>Saldo Líquido</span>
                        <strong>{(totalIncome - totalExpense).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </div>
                </div>

                {/* Seções de Gráficos e Listas PDF */}
                {(isPdfMode || isShowingIncome) && (
                    <ReportSection 
                        title="Entradas / Recebimentos" 
                        typeColor="var(--income-color)" 
                        chartData={incomeChartData} 
                        listData={incomeTransactions}
                        isPdfMode={isPdfMode}
                        categories={categories}
                    />
                )}

                {(isPdfMode || !isShowingIncome) && (
                    <ReportSection 
                        title="Saídas / Despesas" 
                        typeColor="var(--expense-color)" 
                        chartData={expenseChartData} 
                        listData={expenseTransactions}
                        isPdfMode={isPdfMode}
                        categories={categories}
                    />
                )}

                {/* Widgets Extras (Sem Borda Dupla) */}
                {(isPdfMode || !isShowingIncome) && (
                    <div className="report-widgets-grid">
                        <div><BudgetProgressList budgets={budgets} expensesByCategory={expensesByCategory} /></div>
                        <div><GoalProgressList goals={goals} hideActions={true} /></div>
                    </div>
                )}

                {/* Lista da TELA (Interativa com Filtros) - Oculta no PDF */}
                {!isPdfMode && (
                    <div className="report-list-container">
                        <div className="report-list-header"> 
                            <h3>Transações Detalhadas ({isShowingIncome ? 'Entradas' : 'Saídas'})</h3> 
                            <div className="report-filters-wrapper">
                                <input type="text" placeholder="Filtrar por descrição..." value={screenFilterText} onChange={(e) => setScreenFilterText(e.target.value)} className="filter-input" />
                                <Select options={categoryOptions} value={screenCategoryFilter} onChange={setScreenCategoryFilter} placeholder="Categorias..." isMulti className="filter-input" />
                            </div>
                        </div>
                        <div className="list-container" style={{boxShadow: 'none', padding: 0}}> 
                            <TransactionList transactions={screenTransactions} categories={categories} onDeleteTransaction={() => {}} onEditTransaction={() => {}} onTogglePaid={() => {}} isReadOnly={true} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportPage;