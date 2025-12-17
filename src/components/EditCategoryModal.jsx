import React, { useState, useEffect } from 'react';

const EditCategoryModal = ({ isOpen, onClose, category, onSave }) => {
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
                        <input
                            type="color"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            aria-label="Cor da categoria"
                            className="edit-category-color-picker" 
                        />
                    </div>

                    <div className="modal-actions" style={{ marginTop: '10px' }}> 
                        <button type="button" onClick={onClose} className="modal-button cancel">Cancelar</button>
                        <button type="submit" className="modal-button confirm" style={{ backgroundColor: 'var(--primary-color)' }}>Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCategoryModal;