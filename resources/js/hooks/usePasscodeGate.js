import { useState } from 'react';

/**
 * Wraps a sensitive save action behind a passcode confirmation modal.
 * Usage: const { open, gate, confirm, close, error, setError } = usePasscodeGate();
 * <button onClick={() => gate(save)}>Save</button>
 * {open && <PasscodeModal onConfirm={confirm} onClose={close} error={error} />}
 */
export default function usePasscodeGate() {
    const [pendingAction, setPendingAction] = useState(null);
    const [error, setError] = useState('');

    const gate = (action) => {
        setError('');
        setPendingAction(() => action);
    };

    const confirm = (passcode) => {
        if (pendingAction) pendingAction(passcode);
    };

    const close = () => {
        setPendingAction(null);
        setError('');
    };

    return { open: pendingAction !== null, gate, confirm, close, error, setError };
}
