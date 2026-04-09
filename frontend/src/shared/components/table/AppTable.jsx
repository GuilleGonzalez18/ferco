import { Fragment, useEffect, useRef, useState } from 'react';
import './AppTable.css';

function getValue(row, column, rowIndex) {
  if (typeof column.render === 'function') {
    return column.render(row, rowIndex);
  }
  if (typeof column.accessor === 'function') {
    return column.accessor(row, rowIndex);
  }
  if (typeof column.accessor === 'string') {
    return row?.[column.accessor];
  }
  if (typeof column.key === 'string') {
    return row?.[column.key];
  }
  return '';
}

function getClassName(value, row, rowIndex) {
  if (typeof value === 'function') {
    return value(row, rowIndex) || '';
  }
  return value || '';
}

function getRowKey(row, rowKey, rowIndex) {
  if (typeof rowKey === 'function') return rowKey(row, rowIndex);
  if (typeof rowKey === 'string') {
    const keyValue = row?.[rowKey];
    if (keyValue !== undefined && keyValue !== null) return keyValue;
  }
  return rowIndex;
}

function getHeaderLabel(column) {
  if (typeof column.mobileLabel === 'string') return column.mobileLabel;
  if (typeof column.label === 'string') return column.label;
  if (typeof column.header === 'string') return column.header;
  return '';
}

export default function AppTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  emptyMessage = 'Sin datos para mostrar.',
  className = '',
  tableClassName = '',
  rowClassName,
  onRowClick,
  expandedRowId = null,
  renderExpandedRow,
  headerRowClassName = '',
  emptyColSpan,
  stickyHeader = false,
}) {
  const wrapRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(null);
  const colSpan = emptyColSpan || Math.max(columns.length, 1);
  const computedMinWidth = Math.max(680, columns.length * 120);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!stickyHeader) return;

    const updateHeight = () => {
      const el = wrapRef.current;
      if (!el) return;
      const { top } = el.getBoundingClientRect();
      const bottomGap = 16;
      const available = Math.floor(window.innerHeight - top - bottomGap);
      setViewportHeight(Math.max(220, available));
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [stickyHeader, columns.length, rows.length]);

  const wrapperStyle = {
    '--app-table-min-width': `${computedMinWidth}px`,
  };

  if (stickyHeader && viewportHeight !== null) {
    wrapperStyle['--app-table-max-height'] = `${viewportHeight}px`;
  }

  return (
    <div
      ref={wrapRef}
      className={`app-table-wrap ${stickyHeader ? 'is-sticky-header' : ''} ${className}`.trim()}
      style={wrapperStyle}
    >
      <table className={`app-table ${tableClassName}`.trim()}>
        <thead>
          <tr className={headerRowClassName}>
            {columns.map((column) => {
              const alignClass = column.align ? `is-${column.align}` : '';
              const thClassName = getClassName(column.headerClassName);
              return (
                <th key={column.key || column.label || column.header} className={`${alignClass} ${thClassName}`.trim()}>
                  {column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="app-table-empty-row">
              <td colSpan={colSpan} className="app-table-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          )}

          {rows.map((row, rowIndex) => {
            const key = getRowKey(row, rowKey, rowIndex);
            const isExpanded = expandedRowId !== null && String(expandedRowId) === String(key);
            const customRowClassName = getClassName(rowClassName, row, rowIndex);

            return (
              <Fragment key={key}>
                <tr
                  className={`app-table-row ${isExpanded ? 'is-expanded' : ''} ${onRowClick ? 'is-clickable' : ''} ${customRowClassName}`.trim()}
                  onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                >
                  {columns.map((column) => {
                    const alignClass = column.align ? `is-${column.align}` : '';
                    const cellClassName = getClassName(column.cellClassName, row, rowIndex);
                    const value = getValue(row, column, rowIndex);
                    return (
                      <td
                        key={`${column.key || column.label || column.header}-${key}`}
                        className={`${alignClass} ${cellClassName}`.trim()}
                        data-label={getHeaderLabel(column)}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>

                {isExpanded && typeof renderExpandedRow === 'function' && (
                  <tr className="app-table-expanded-row">
                    <td colSpan={colSpan} className="app-table-expanded-cell">
                      <div className="app-table-expanded-content">{renderExpandedRow(row, rowIndex)}</div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
