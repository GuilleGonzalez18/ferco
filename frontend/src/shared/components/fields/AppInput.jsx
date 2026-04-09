import { forwardRef } from 'react';
import './AppField.css';

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

const AppInput = forwardRef(function AppInput({ className = '', type = 'text', ...props }, ref) {
  return <input ref={ref} type={type} className={joinClassNames('app-field-control', className)} {...props} />;
});

export default AppInput;
