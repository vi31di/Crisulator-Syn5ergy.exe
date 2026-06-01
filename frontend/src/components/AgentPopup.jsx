export default function AgentPopup({ message, type, onClose }) {
  return (
    <div className={`fixed right-4 w-72 p-3 rounded-lg shadow-lg text-white 
      ${type === "manager" ? "bg-red-500 top-20" : ""}
      ${type === "client" ? "bg-orange-500 top-40" : ""}
      ${type === "teammate" ? "bg-blue-500 top-60" : ""}
      ${type === "lead" ? "bg-purple-500 top-80" : ""}
    `}>
      <div className="flex justify-between font-bold">
        {type.toUpperCase()}
        <button onClick={onClose}>×</button>
      </div>
      <div className="mt-2 text-sm">{message}</div>
    </div>
  );
}