import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app and shows splash screen', () => {
  render(<App />);
  const titleElement = screen.getByText(/CuraFamilia/i);
  expect(titleElement).toBeInTheDocument();
});
