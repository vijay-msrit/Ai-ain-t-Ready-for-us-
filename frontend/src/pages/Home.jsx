import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CometCard } from "../components/ui/comet-card";

// Sleek, transparent stroke icons
const IconDb = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>;
const IconBug = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"></rect><path d="m19 7-3 2"></path><path d="m5 7 3 2"></path><path d="m19 19-3-2"></path><path d="m5 19 3-2"></path><path d="M20 13h-4"></path><path d="M4 13h4"></path><path d="m10 4 1 2"></path><path d="m14 4-1 2"></path></svg>;
const IconTarget = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;
const IconTool = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>;
const IconCheck = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>;
const IconArrow = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const IconLogo = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 6 2 12 8 18"></polyline><polyline points="16 18 22 12 16 6"></polyline><line x1="14" y1="4" x2="10" y2="20"></line></svg>;

const SHARED_BLUE = "var(--accent-blue)"; // Matches Next button & logo block
const SHARED_ORANGE = "var(--accent-yellow)"; // Matches Active steps & Pipeline accent

const AGENTS = [
  {
    name: "Indexer Agent",
    icon: <IconDb />,
    desc: "Clones the repository and chunks the codebase into a dense ChromaDB vector graph.",
  },
  {
    name: "Issue Processor",
    icon: <IconBug />,
    desc: "Extracts context, categorizes the bug, and identifies reproduction steps automatically.",
  },
  {
    name: "Localizer Agent",
    icon: <IconTarget />,
    desc: "Performs semantic search across the vector space to pinpoint the exact broken files.",
  },
  {
    name: "Patcher Agent",
    icon: <IconTool />,
    desc: "Feeds context to the LLM to generate a minimal, safe, and syntactically valid patch diff.",
  },
  {
    name: "Evaluator Agent",
    icon: <IconCheck />,
    desc: "Grades the patch against strict rubrics, creates tests, and ships the Pull Request.",
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      <div style={{
        minHeight: "100vh",
        background: "var(--bg-main)", // Exact flat background
        position: "relative",
        overflowX: "hidden"
      }}>
      {/* Animated Star/Particle Background entirely with blue accents */}
      <div className="stars-container" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {[...Array(50)].map((_, i) => {
          const size = Math.random() * 2 + 1;
          const left = Math.random() * 100;
          const top = Math.random() * 100;
          const duration = Math.random() * 3 + 2;
          const delay = Math.random() * 2;
          const isColored = Math.random() > 0.7; // 30% of stars have color
          const isBlue = isColored && Math.random() > 0.5;
          const isOrange = isColored && !isBlue;
          
          let starColor = "var(--text-main)";
          let glowColor = "rgba(255, 255, 255, 0.2)";
          if (isBlue) {
            starColor = SHARED_BLUE;
            glowColor = `${SHARED_BLUE}80`;
          } else if (isOrange) {
            starColor = SHARED_ORANGE;
            glowColor = `${SHARED_ORANGE}80`;
          }

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.6, 0], scale: [0, 1, 0] }}
              transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                left: `${left}%`, top: `${top}%`,
                width: size, height: size,
                backgroundColor: starColor,
                borderRadius: "50%",
                boxShadow: `0 0 6px 1px ${glowColor}`
              }}
            />
          );
        })}
      </div>

      <div style={{ position: "relative", zIndex: 10, maxWidth: "1100px", margin: "0 auto", padding: "80px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        {/* Header Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: "center", marginBottom: "60px" }}
        >
          <div style={{ display: "inline-block", marginBottom: "24px" }}>
            <div style={{ 
              width: "80px", height: "80px", margin: "0 auto", borderRadius: "16px",
              background: "var(--accent-blue)",
              display: "flex", alignItems: "center", justifyContent: "center" 
            }}>
              <IconLogo />
            </div>
          </div>
          
          <h1 style={{ 
            fontSize: "72px", 
            fontWeight: "900", 
            letterSpacing: "-0.04em",
            margin: 0,
            color: SHARED_ORANGE
          }}>
            Fixora
          </h1>
          <p style={{ fontSize: "16px", color: "var(--text-main)", fontWeight: "700", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: "12px" }}>
            The AI That Actually Fixes Bugs.
          </p>
          
          <p style={{ maxWidth: "600px", margin: "24px auto 40px", fontSize: "18px", color: "var(--text-muted)", lineHeight: "1.6" }}>
            Provide a GitHub issue. Fixora will index the code, locate the bug, generate a patch, and open a PR — automatically.
          </p>
          
          {/* Main Call to Action */}
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: `0 0 30px ${SHARED_BLUE}80` }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/indexer")}
            style={{
              padding: "16px 40px",
              fontSize: "16px",
              fontWeight: "700",
              color: "#fff",
              background: SHARED_BLUE,
              border: "none",
              borderRadius: "50px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: "0 auto",
              transition: "all 0.3s ease",
              boxShadow: `0 8px 20px -5px ${SHARED_BLUE}60`
            }}
          >
            Launch Multi-Agent Workflow
            <IconArrow />
          </motion.button>
        </motion.div>

        {/* ── Tech Stack Marquee ── */}
        <div style={{ width: "100vw", marginLeft: "calc(-50vw + 50%)", marginBottom: "60px", marginTop: "20px", overflow: "hidden" }}>
          <p style={{ textAlign: "center", fontSize: "11px", fontWeight: "700", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "20px" }}>
            Built with
          </p>
          {/* Fade masks */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "120px", background: "linear-gradient(to right, var(--bg-main), transparent)", zIndex: 2, pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "120px", background: "linear-gradient(to left, var(--bg-main), transparent)", zIndex: 2, pointerEvents: "none" }} />
            <div style={{ display: "flex", gap: "12px", animation: "marquee 28s linear infinite", width: "max-content" }}>
              {[
                { name: "Python", color: "#3B82F6" },
                { name: "FastAPI", color: "#10B981" },
                { name: "React", color: "#38BDF8" },
                { name: "Vite", color: "#A78BFA" },
                { name: "ChromaDB", color: "#F59E0B" },
                { name: "OpenAI GPT-4", color: "#10B981" },
                { name: "GitHub API", color: "#6B7280" },
                { name: "GitPython", color: "#F97316" },
                { name: "PyGithub", color: "#EC4899" },
                { name: "Framer Motion", color: "#8B5CF6" },
                { name: "AWS EC2", color: "#F59E0B" },
                { name: "Docker", color: "#38BDF8" },
                { name: "LangChain", color: "#22C55E" },
                // Duplicate for seamless loop
                { name: "Python", color: "#3B82F6" },
                { name: "FastAPI", color: "#10B981" },
                { name: "React", color: "#38BDF8" },
                { name: "Vite", color: "#A78BFA" },
                { name: "ChromaDB", color: "#F59E0B" },
                { name: "OpenAI GPT-4", color: "#10B981" },
                { name: "GitHub API", color: "#6B7280" },
                { name: "GitPython", color: "#F97316" },
                { name: "PyGithub", color: "#EC4899" },
                { name: "Framer Motion", color: "#8B5CF6" },
                { name: "AWS EC2", color: "#F59E0B" },
                { name: "Docker", color: "#38BDF8" },
                { name: "LangChain", color: "#22C55E" },
              ].map((tech, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "8px 18px", borderRadius: "9999px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  fontSize: "13px", fontWeight: "600",
                  color: "var(--text-main)",
                  whiteSpace: "nowrap",
                  boxShadow: "var(--shadow-idle)",
                  flexShrink: 0,
                }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: tech.color, flexShrink: 0 }} />
                  {tech.name}
                </span>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes marquee {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </div>

        {/* Agents Grid using CometCard */}
        <div style={{ width: "100%" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-main)", marginBottom: "32px", textAlign: "center" }}>
            Meet the Agents
          </h2>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
            gap: "24px",
            justifyItems: "center"
          }}>
            {AGENTS.map((agent, i) => (
              <motion.div 
                key={agent.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                style={{ width: "100%", maxWidth: "350px" }}
              >
                <CometCard containerClassName="h-full">
                  <div style={{
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    height: "100%",
                    width: "100%"
                  }}>
                    <div style={{ 
                      width: "48px", height: "48px", 
                      borderRadius: "12px", 
                      background: SHARED_BLUE,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff"
                    }}>
                      {agent.icon}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)", margin: "0 0 8px 0" }}>
                        {agent.name}
                      </h3>
                      <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6", margin: 0 }}>
                        {agent.desc}
                      </p>
                    </div>
                  </div>
                </CometCard>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
      </div>
    </>
  );
}
