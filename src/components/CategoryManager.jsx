import React, { useState } from 'react';

const CategoryManager = ({ categories = [], onAddCategory, onDeleteCategory, onEditCategory }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6a82fb'); // Cor padrão mais alinhada

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return; // Impede categorias vazias
    onAddCategory({ name: name.trim(), color });
    setName('');
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation(); // Impede que o clique dispare a edição da linha
    onDeleteCategory(id, 'category');
  };

  return (
    <div className="category-manager">
      <h3>Gerenciar Categorias</h3>
      <form onSubmit={handleSubmit} className="category-form">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome da categoria"
          aria-label="Nome da nova categoria"
        />
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          aria-label="Cor da categoria"
        />
        <button type="submit" className="submit-button" style={{ padding: '8px 15px' }}>
          +
        </button>
      </form>
      <ul className="category-list">
        {categories.length === 0 ? (
          <p className="empty-message" style={{textAlign: 'left', padding: '10px 0'}}>Crie sua primeira categoria!</p>
        ) : (
          categories.map(cat => (
            // Adiciona onClick na linha para chamar a edição
            <li key={cat.id} onClick={() => onEditCategory(cat)}>
              <div className="category-name-wrapper">
                <span className="color-dot" style={{ backgroundColor: cat.color }}></span>
                {cat.name}
              </div>
              {/* Botão de deletar separado */}
              <button className="delete-button action-button" onClick={(e) => handleDeleteClick(e, cat.id)} aria-label={`Excluir categoria ${cat.name}`}>
                🗑️
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default CategoryManager;