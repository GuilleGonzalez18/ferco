import { forwardRef } from 'react';
import './AppField.css';

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

const AppSelect = forwardRef(function AppSelect({ className = '', children, ...props }, ref) {
  return (
    <select ref={ref} className={joinClassNames('app-field-control', className)} {...props}>
      {children}
    </select>
  );
});

export default AppSelect;
