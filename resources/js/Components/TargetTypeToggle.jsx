export default function TargetTypeToggle({ type, onChange }) {
    return (
        <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
                type="button"
                onClick={() => onChange('databoy')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
                    type === 'databoy' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                Databoy
            </button>
            <button
                type="button"
                onClick={() => onChange('party_agent')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
                    type === 'party_agent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                Party Agent
            </button>
        </div>
    );
}
