import { forwardRef } from 'react';
import './AppField.css';

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

const AppTextarea = forwardRef(function AppTextarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={joinClassNames('app-field-control', className)} {...props} />;
});

export default AppTextarea;
