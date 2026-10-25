import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth="sm"
      actions={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              destructive
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-sm'
                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm'
            }`}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {destructive && (
          <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        )}
        <p className="text-zinc-300 leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
};
