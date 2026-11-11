import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { PRIORITIES, PRIORITY_LABELS } from '../data/constants';
import type { AgentId, Priority, SubmitProposalInput } from '../types';
import { Button } from './Button';
import { SelectField, TextField } from './Field';

interface ProposalFormProps {
  agentId: AgentId;
  defaultPriority: Priority;
  currencyCode: string;
  busy: boolean;
  onSubmit: (input: SubmitProposalInput) => Promise<boolean>;
  onCancel: () => void;
}

export function ProposalForm({
  agentId,
  defaultPriority,
  currencyCode,
  busy,
  onSubmit,
  onCancel,
}: ProposalFormProps) {
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [priority, setPriority] = useState<Priority>(defaultPriority);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await onSubmit({
      agentId,
      merchant,
      description,
      amount: Number(amount),
      priority,
    });
    if (ok) {
      setMerchant('');
      setDescription('');
      setAmount('');
      onCancel();
    }
  };

  return (
    <form className="form form--compact" onSubmit={handleSubmit}>
      <TextField
        label="Merchant"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        placeholder="e.g. SkyJet Airlines"
        required
      />
      <TextField
        label="Item description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What is being purchased?"
        required
      />
      <div className="form__row">
        <TextField
          label={`Amount (${currencyCode})`}
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
        <SelectField
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="form__actions">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} icon={<Send size={16} />}>
          Submit proposal
        </Button>
      </div>
    </form>
  );
}
