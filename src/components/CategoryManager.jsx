// COMPLETO: src/components/CategoryManager.jsx
// - Alterado ícone FaTimes para '×'
import React, { useState } from 'react';
// import { FaTimes } from 'react-icons/fa'; // Não mais necessário

const CategoryManager = ({ categories = [], onAddCategory, onDeleteCategory, onEditCategory }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6a82fb');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddCategory({ name: name.trim(), color });
    setName('');
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    onDeleteCategory(id, 'category');
  };

  return (
    <div className="category-manager">
      <h3>Gerenciar Categorias</h3>
      <form onSubmit={handleSubmit} className="category-form">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da categoria" />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        <button type="submit" className="submit-button">+</button>
      </form>
      <ul className="category-list">
        {categories.length > 0 ? (
          [...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
            <li key={cat.id} onClick={() => onEditCategory(cat)} title={`Editar ${cat.name}`}>
              <div className="category-name-wrapper">
                <span className="color-dot" style={{ backgroundColor: cat.color }}></span>
                {cat.name}
              </div>
              <button className="delete-button action-button" onClick={(e) => handleDeleteClick(e, cat.id)} title={`Excluir ${cat.name}`}>
                × {/* Alterado de <FaTimes /> para '×' */}
              </button>
            </li>
          ))
        ) : (
          <p className="empty-message" style={{textAlign: "left", padding: "10px 0"}}>Crie sua primeira categoria!</p>
        )}
      </ul>
    </div>
  );
};

export default CategoryManager;