// ─────────────────────────────────────────────────────────────────
// SweetAlert2 Theme CSS — Tokyo Midnight Creative Studio overrides.
// Extracted from studio-theme.jsx for maintainability.
// ─────────────────────────────────────────────────────────────────

import { fonts, studio } from "./studio-theme.jsx";

export const swal2Theme = `
  .studio-modal {
    font-family: ${fonts.sans} !important;
    border: 1px solid ${studio.border} !important;
    border-radius: 12px !important;
    background: ${studio.midnight} !important;
    box-shadow: 0 32px 64px rgba(0, 0, 0, 0.6) !important;
    padding: 32px !important;
    width: 480px !important;
    max-width: 95vw !important;
    text-align: left !important;
  }
  
  .studio-modal-header {
    margin-bottom: 20px !important;
  }

  .studio-modal-title {
    font-family: ${fonts.display} !important;
    font-size: 1.25rem !important;
    font-weight: 700 !important;
    color: ${studio.text.primary} !important;
    margin: 0 !important;
    padding: 0 !important;
    line-height: 1.2 !important;
  }

  .studio-modal-subtitle {
    font-family: ${fonts.sans} !important;
    font-size: 0.875rem !important;
    color: ${studio.text.secondary} !important;
    margin: 8px 0 0 0 !important;
    line-height: 1.5 !important;
  }

  .studio-modal-content {
    margin-top: 24px !important;
  }

  .swal2-html-container {
    margin: 0 !important;
    padding: 0 !important;
    text-align: left !important;
  }

  .swal2-actions {
    margin-top: 32px !important;
    padding: 0 !important;
    gap: 12px !important;
    width: 100% !important;
    justify-content: flex-end !important;
    flex-direction: row !important;
  }
  
  .studio-btn-primary {
    background: ${studio.neon.violet} !important;
    border: none !important;
    border-radius: 6px !important;
    color: white !important;
    padding: 10px 20px !important;
    font-weight: 600 !important;
    font-family: ${fonts.sans} !important;
    font-size: 13px !important;
    transition: all 0.2s ease !important;
    margin: 0 !important;
    cursor: pointer !important;
  }
  
  .studio-btn-primary:hover { background: #7c3aed !important; }
  
  .studio-btn-secondary {
    background: ${studio.surface} !important;
    border: 1px solid ${studio.border} !important;
    border-radius: 6px !important;
    color: ${studio.text.secondary} !important;
    padding: 10px 20px !important;
    font-weight: 600 !important;
    font-family: ${fonts.sans} !important;
    font-size: 13px !important;
    transition: all 0.2s ease !important;
    margin: 0 !important;
    cursor: pointer !important;
  }

  .swal2-input, .swal2-textarea {
    background: ${studio.abyss} !important;
    color: ${studio.text.primary} !important;
    border: 1px solid ${studio.border} !important;
    border-radius: 6px !important;
    font-family: ${fonts.sans} !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 10px 12px !important;
    font-size: 14px !important;
    outline: none !important;
  }
  
  .swal2-input:focus, .swal2-textarea:focus {
    border-color: ${studio.neon.violet} !important;
  }

  .swal2-close {
    color: ${studio.text.muted} !important;
    background: transparent !important;
    font-size: 20px !important;
    width: 32px !important;
    height: 32px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 6px !important;
    transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1) !important;
    position: absolute !important;
    top: 16px !important;
    right: 16px !important;
    margin: 0 !important;
    border: 1px solid transparent !important;
  }
  
  .swal2-close:hover {
    color: ${studio.text.primary} !important;
    background: ${studio.surface} !important;
    border-color: ${studio.border} !important;
  }

  .swal2-close:active {
    transform: scale(0.92) !important;
    background: ${studio.elevated} !important;
  }
  
  .studio-toast {
    background: ${studio.elevated} !important;
    border: 1px solid ${studio.border} !important;
    border-radius: 8px !important;
    color: ${studio.text.primary} !important;
    font-family: ${fonts.sans} !important;
  }

  .studio-tag {
    background: ${studio.surface};
    border: 1px solid ${studio.border};
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 10px;
    color: ${studio.text.muted};
    font-family: ${fonts.mono};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .studio-code-block {
    background: ${studio.abyss};
    border: 1px solid ${studio.border};
    border-radius: 6px;
    padding: 16px;
    font-family: ${fonts.mono};
    font-size: 12px;
    color: ${studio.text.primary};
    word-break: break-all;
    line-height: 1.6;
    margin-top: 12px;
  }
`;
