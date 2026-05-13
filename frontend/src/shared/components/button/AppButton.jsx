import './AppButton.css';

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

export default function AppButton({
  tone = 'primary',
  size = 'md',
  iconOnly = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      {...props}
      className={joinClassNames(
        'app-button',
        `app-button--${tone}`,
        `app-button--${size}`,
        iconOnly ? 'app-button--icon-only' : '',
        className
      )}
    >
      {children}
    </button>
  );
}
