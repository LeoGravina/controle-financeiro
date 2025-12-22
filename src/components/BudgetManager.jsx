import React, { useState, useMemo } from 'react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import Select from 'react-select';
import CurrencyInput from './CurrencyInput'; 
import { FaTimes } from 'react-icons/fa';
import EditBudgetModal from './EditBudgetModal'; 

const BudgetManager = ({ categories = [], currentMonth, budgets = [] }) => {
    const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState(null);
    const [addAmount, setAddAmount] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

    const user = auth.currentUser;
    
    // Função auxiliar para pegar a cor da categoria
    const getCategoryColor = (categoryName) => {
        const cat = categories.find(c => c.name === categoryName);
        return cat ? cat.color : '#bdc3c7'; // Retorna cinza se não achar
    };

    const categoryOptionsToAdd = useMemo(() => {
        const budgetedCategoryNames = budgets.map(b => b.categoryName);
        return categories
            .filter(cat => !budgetedCategoryNames.includes(cat.name))
            .map(cat => ({ value: cat.name, label: cat.name, color: cat.color }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [categories, budgets]);

    const handleAddBudget = async (e) => {
        e.preventDefault();
        if (!user || !selectedCategoryToAdd || addAmount === '' || parseFloat(addAmount) <= 0) {
            alert("Selecione uma categoria e insira um limite válido.");
            return;
        }

        try {
            await addDoc(collection(db, 'budgets'), {
                userId: user.uid,
                categoryName: selectedCategoryToAdd.value,
                month: currentMonth.getMonth(),
                year: currentMonth.getFullYear(),
                limitAmount: parseFloat(addAmount)
            });
            setSelectedCategoryToAdd(null);
            setAddAmount('');
        } catch (error) {
            console.error("Erro ao adicionar orçamento:", error);
            alert("Erro ao adicionar. Tente novamente.");
        }
    };

    const handleUpdateBudget = async (updatedBudget) => {
        if (!user || !updatedBudget || !updatedBudget.id) return;
        try {
            const budgetRef = doc(db, 'budgets', updatedBudget.id);
            await updateDoc(budgetRef, { limitAmount: parseFloat(updatedBudget.limitAmount) });
            setEditingBudget(null);
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Erro ao atualizar:", error);
            alert("Erro ao salvar.");
        }
    };

    const handleDeleteBudget = async (e, budgetId, categoryName) => {
        e.stopPropagation(); // Evita abrir o modal ao clicar no X
        if (window.confirm(`Remover orçamento de "${categoryName}"?`)) {
            try {
                await deleteDoc(doc(db, 'budgets', budgetId));
            } catch (error) {
                console.error("Erro ao deletar:", error);
            }
        }
    };

    const openEditModal = (budget) => {
        setEditingBudget(budget);
        setIsEditModalOpen(true);
    };

    return (
        <>
            {isEditModalOpen && (
                <EditBudgetModal 
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    budget={editingBudget}
                    onSave={handleUpdateBudget}
                />
            )}

            <div className="budget-manager card-style">
                <h4>Adicionar Orçamento</h4>
                <form onSubmit={handleAddBudget} className="budget-add-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <Select
                        options={categoryOptionsToAdd}
                        value={selectedCategoryToAdd}
                        onChange={setSelectedCategoryToAdd}
                        placeholder="-- Categoria --"
                        classNamePrefix="react-select"
                        noOptionsMessage={() => "Todas as categorias já têm orçamento"}
                    />
                    <CurrencyInput 
                        value={addAmount} 
                        onChange={setAddAmount} 
                        placeholder="Limite (R$)"
                        className="currency-input"
                    />
                    <button type="submit" className="submit-button" style={{ width: '100%' }}>
                        Adicionar
                    </button>
                </form>

                <h4 style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    Orçamentos do Mês
                </h4>
                
                {budgets.length === 0 ? (
                    <p style={{ color: '#999', fontStyle: 'italic' }}>Nenhum orçamento definido.</p>
                ) : (
                    <ul className="budget-list">
                        {budgets.sort((a,b) => a.categoryName.localeCompare(b.categoryName)).map(budget => (
                            <li 
                                key={budget.id} 
                                onClick={() => openEditModal(budget)}
                                style={{
                                    backgroundColor: getCategoryColor(budget.categoryName),
                                    // Removemos transform/transition inline para usar o do CSS
                                }}
                                title="Clique para editar"
                            >
                                <span>{budget.categoryName}</span>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>
                                        {budget.limitAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    <button 
                                        onClick={(e) => handleDeleteBudget(e, budget.id, budget.categoryName)}
                                        title="Remover orçamento"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
};

export default BudgetManager;