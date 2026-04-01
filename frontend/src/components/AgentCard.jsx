import { motion } from "framer-motion";

const STATUS = {
  idle:    { dot: "bg-muted",    text: "text-muted",         bg: "bg-navy-border/40",   label: "Idle" },
  running: { dot: "bg-yellow",   text: "text-yellow",        bg: "bg-yellow/10",        label: "Running" },
  success: { dot: "bg-success",  text: "text-success",       bg: "bg-success/10",       label: "Success" },
  error:   { dot: "bg-danger",   text: "text-danger",        bg: "bg-danger/10",        label: "Error" },
};

export default function AgentCard({ title, description, status = "idle", icon, children }) {
  const cfg = STATUS[status] || STATUS.idle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="card-dark p-7"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-11 h-11 rounded-2xl bg-yellow/10 border border-yellow/20 flex items-center justify-center text-2xl">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">{title}</h2>
            {description && <p className="text-muted text-sm mt-0.5">{description}</p>}
          </div>
        </div>

        <span className={`badge ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === "running" ? "animate-pulse" : ""}`} />
          {cfg.label}
        </span>
      </div>

      <div className="h-px bg-navy-border mb-5" />

      <div>{children}</div>
    </motion.div>
  );
}
