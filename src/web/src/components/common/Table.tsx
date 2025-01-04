// @mui/material v5.14.0
import React, { useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Checkbox,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { visuallyHidden } from '@mui/utils';
import Loading from './Loading';
import { lightTheme } from '../../styles/theme';

// Enhanced table container with Material Design styling
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  backgroundColor: theme.palette.background.paper,
  overflow: 'auto',
  position: 'relative',
  '&:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

// Enhanced table cell with accessibility improvements
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  transition: theme.transitions.create(['background-color']),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&[aria-sort]': {
    fontWeight: theme.typography.fontWeightMedium,
  },
}));

// Interface for column configuration
export interface Column {
  id: string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
  ariaLabel?: string;
  headerProps?: object;
}

// Interface for table props
export interface TableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  sortable?: boolean;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  ariaLabel?: string;
  stickyHeader?: boolean;
  dense?: boolean;
  rowsPerPageOptions?: number[];
  selectedRows?: string[];
  onRowSelect?: (ids: string[]) => void;
}

// Main table component
export const CustomTable = React.memo<TableProps>(({
  columns,
  data,
  loading = false,
  sortable = true,
  onSort,
  onRowClick,
  emptyMessage = 'No data available',
  ariaLabel = 'Data table',
  stickyHeader = false,
  dense = false,
  selectedRows = [],
  onRowSelect,
}) => {
  // State for sorting
  const [sortColumn, setSortColumn] = React.useState<string>('');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  // Memoized selected rows set for performance
  const selectedRowsSet = useMemo(() => new Set(selectedRows), [selectedRows]);

  // Handle sort change
  const handleSort = useCallback((columnId: string) => {
    const isAsc = sortColumn === columnId && sortDirection === 'asc';
    const newDirection = isAsc ? 'desc' : 'asc';
    setSortColumn(columnId);
    setSortDirection(newDirection);
    onSort?.(columnId, newDirection);
  }, [sortColumn, sortDirection, onSort]);

  // Handle row selection
  const handleRowSelect = useCallback((rowId: string) => {
    if (!onRowSelect) return;
    
    const newSelected = new Set(selectedRowsSet);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    onRowSelect(Array.from(newSelected));
  }, [selectedRowsSet, onRowSelect]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!onRowSelect) return;
    
    if (selectedRowsSet.size === data.length) {
      onRowSelect([]);
    } else {
      onRowSelect(data.map(row => row.id));
    }
  }, [data, selectedRowsSet.size, onRowSelect]);

  // Render table header
  const renderTableHeader = useCallback(() => (
    <TableHead>
      <TableRow>
        {onRowSelect && (
          <StyledTableCell padding="checkbox">
            <Checkbox
              indeterminate={selectedRowsSet.size > 0 && selectedRowsSet.size < data.length}
              checked={data.length > 0 && selectedRowsSet.size === data.length}
              onChange={handleSelectAll}
              inputProps={{
                'aria-label': 'select all rows',
              }}
            />
          </StyledTableCell>
        )}
        {columns.map((column) => (
          <StyledTableCell
            key={column.id}
            align={column.align || 'left'}
            style={{ width: column.width }}
            {...column.headerProps}
          >
            {column.sortable && sortable ? (
              <TableSortLabel
                active={sortColumn === column.id}
                direction={sortColumn === column.id ? sortDirection : 'asc'}
                onClick={() => handleSort(column.id)}
                aria-label={column.ariaLabel || `Sort by ${column.label}`}
              >
                {column.label}
                {sortColumn === column.id && (
                  <span style={visuallyHidden}>
                    {sortDirection === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </span>
                )}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </StyledTableCell>
        ))}
      </TableRow>
    </TableHead>
  ), [columns, sortable, sortColumn, sortDirection, handleSort, onRowSelect, data.length, selectedRowsSet.size]);

  // Render table body
  const renderTableBody = useCallback(() => (
    <TableBody>
      {data.length === 0 ? (
        <TableRow>
          <StyledTableCell
            colSpan={columns.length + (onRowSelect ? 1 : 0)}
            align="center"
          >
            {emptyMessage}
          </StyledTableCell>
        </TableRow>
      ) : (
        data.map((row, index) => (
          <TableRow
            key={row.id || index}
            hover={!!onRowClick}
            onClick={() => onRowClick?.(row)}
            selected={selectedRowsSet.has(row.id)}
            sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
          >
            {onRowSelect && (
              <StyledTableCell padding="checkbox">
                <Checkbox
                  checked={selectedRowsSet.has(row.id)}
                  onChange={() => handleRowSelect(row.id)}
                  inputProps={{
                    'aria-label': `select row ${index + 1}`,
                  }}
                />
              </StyledTableCell>
            )}
            {columns.map((column) => (
              <StyledTableCell
                key={column.id}
                align={column.align || 'left'}
              >
                {column.render ? column.render(row[column.id], row) : row[column.id]}
              </StyledTableCell>
            ))}
          </TableRow>
        ))
      )}
    </TableBody>
  ), [data, columns, onRowClick, selectedRowsSet, onRowSelect, handleRowSelect, emptyMessage]);

  return (
    <StyledTableContainer
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {loading ? (
        <Loading size="large" color={lightTheme.palette.primary.main} />
      ) : (
        <Table
          stickyHeader={stickyHeader}
          size={dense ? 'small' : 'medium'}
          aria-label={ariaLabel}
        >
          {renderTableHeader()}
          {renderTableBody()}
        </Table>
      )}
    </StyledTableContainer>
  );
});

// Display name for debugging
CustomTable.displayName = 'CustomTable';

export default CustomTable;