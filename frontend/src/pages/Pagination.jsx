import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './Pagination.css';

const Pagination = ({ page, pageSize, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '…') {
        pages.push('…');
      }
    }
    return pages;
  };

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="pg-wrap">
      <span className="pg-info">Showing {startItem}–{endItem} of {total}</span>

      <div className="pg-controls">
        <button className="pg-btn pg-nav" onClick={() => onChange(page - 1)} disabled={page === 1}>
          <FiChevronLeft size={14} />
        </button>

        {getPages().map((p, idx) =>
          p === '…' ? (
            <span key={`dots-${idx}`} className="pg-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`pg-btn${p === page ? ' pg-active' : ''}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button className="pg-btn pg-nav" onClick={() => onChange(page + 1)} disabled={page === totalPages}>
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
