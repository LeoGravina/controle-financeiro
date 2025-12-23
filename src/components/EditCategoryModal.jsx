// src/components/EditCategoryModal.jsx
import React, { useState, useEffect } from 'react';
import { FaTrash, FaCheck, FaTimes } from 'react-icons/fa'; // Ícones para ficar pro

const EditCategoryModal = ({ isOpen, onClose, category, onSave, onDelete }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#6a82fb');

    useEffect(() => {
        if (category) {
            setName(category.name || '');
            setColor(category.color || '#6a82fb');
        }
    }, [category]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ ...category, name: name.trim(), color });
    };

    const handleDelete = () => {
        if (window.confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
            onDelete(category.id);
            onClose();
        }
    };

    if (!isOpen || !category) return null;

    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content" onClick={handleContentClick}>
                <h4>Editar Categoria</h4>
                
                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '25px' }}> 

                    <div className="edit-category-inline-form">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Nome da categoria"
                            required
                            aria-label="Nome da categoria"
                        />
                        
                        {/* NOVO: Wrapper bonito para a cor */}
                        <div className="custom-color-wrapper" title="Alterar cor">
                            <div 
                                className="custom-color-display" 
                                style={{ backgroundColor: color }}
                            ></div>
                            <input
                                type="color"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                className="custom-color-input" 
                            />
                        </div>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '15px' }}> 
                        {/* Botão de Excluir (Esquerda) */}
                        <button 
                            type="button" 
                            onClick={handleDelete} 
                            className="modal-btn btn-delete-danger"
                        >
                            <FaTrash size={14} /> Excluir
                        </button>

                        {/* Botões de Ação (Direita) */}
                        <button type="button" onClick={onClose} className="modal-btn btn-cancel">
                            Cancelar
                        </button>
                        <button type="submit" className="modal-btn btn-save">
                            <FaCheck size={14} /> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCategoryModal;