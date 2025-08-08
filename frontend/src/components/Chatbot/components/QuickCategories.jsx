import React from 'react';

const quickCategoriesData = [
    { name: "Chuột Gaming", icon: "🖱️", color: "#ef4444", desc: "DPI cao, ergonomic" },
    { name: "Bàn phím Gaming", icon: "⌨️", color: "#3b82f6", desc: "Mechanical, RGB" },
    { name: "Tai nghe Gaming", icon: "🎧", color: "#8b5cf6", desc: "Surround, mic clear" },
    { name: "Màn hình Gaming", icon: "🖥️", color: "#10b981", desc: "High refresh, low lag" },
    { name: "Laptop Gaming", icon: "💻", color: "#f59e0b", desc: "Hiệu năng mạnh" },
    { name: "PC Gaming", icon: "🎮", color: "#ec4899", desc: "Combo hoàn chỉnh" }
];

const QuickCategories = ({ onCategoryClick }) => {
    return (
        <div className="quick-categories">
            <p className="quick-categories-title">
                📂 Danh mục phổ biến:
            </p>
            <div className="quick-categories-grid">
                {quickCategoriesData.map((category) => (
                    <button
                        key={category.name}
                        onClick={() => onCategoryClick(category.name)}
                        className="category-button"
                        style={{
                            borderColor: category.color || '#e5e7eb',
                            color: category.color || '#374151'
                        }}
                    >
                        <div className="category-button-content">
                            <span className="category-button-icon">{category.icon}</span>
                            <span className="category-button-name">{category.name}</span>
                            {category.desc && (
                                <span className="category-button-desc">
                                    {category.desc}
                                </span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickCategories;
