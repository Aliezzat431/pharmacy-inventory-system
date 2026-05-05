const fs = require('fs');
let c = fs.readFileSync('src/app/chat/page.jsx', 'utf8');

c = c.replace('export default function ChatPage()', 'export default function ChatWidget()');
c = c.replace('const [mode, setMode] = useState("agent");', 'const [isOpen, setIsOpen] = useState(false);\n  const [mode, setMode] = useState("agent");');

c = c.replace(
  '<div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">',
  `<>\n      <AnimatePresence>\n        {!isOpen && (\n          <motion.button\n            initial={{ scale: 0, opacity: 0 }}\n            animate={{ scale: 1, opacity: 1 }}\n            exit={{ scale: 0, opacity: 0 }}\n            whileHover={{ scale: 1.05 }}\n            whileTap={{ scale: 0.95 }}\n            onClick={() => setIsOpen(true)}\n            className="fixed bottom-6 left-6 z-50 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all border border-blue-400"\n          >\n            <HiSparkles className="w-7 h-7" />\n          </motion.button>\n        )}\n      </AnimatePresence>\n\n      <AnimatePresence>\n        {loading && (\n          <motion.div\n            initial={{ opacity: 0 }}\n            animate={{ opacity: 1 }}\n            exit={{ opacity: 0 }}\n            className="pointer-events-none fixed inset-0 z-40 shadow-[inset_0_0_150px_rgba(59,130,246,0.3)] border-4 border-blue-500/50 mix-blend-screen"\n          />\n        )}\n      </AnimatePresence>\n\n      <AnimatePresence>\n        {isOpen && (\n          <motion.div\n            initial={{ y: 20, opacity: 0, scale: 0.95 }}\n            animate={{ y: 0, opacity: 1, scale: 1 }}\n            exit={{ y: 20, opacity: 0, scale: 0.95 }}\n            transition={{ type: "spring", stiffness: 300, damping: 25 }}\n            className={\`fixed bottom-6 left-6 z-[60] w-[400px] h-[600px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] shadow-2xl rounded-3xl flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 border border-gray-200 dark:border-gray-800 transition-all duration-500 \${loading || toolStatus ? "shadow-[0_0_50px_rgba(59,130,246,0.5)] border-blue-500 ring-2 ring-blue-500" : ""}\`}\n          >`
);

c = c.replace(
  '<ModeToggle mode={mode} onToggle={handleModeSwitch} />\n          <button onClick={handleClearChat} title="مسح المحادثة"',
  `<ModeToggle mode={mode} onToggle={handleModeSwitch} />\n          <button onClick={() => setIsOpen(false)} title="إغلاق Copilot" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors">\n            <FiMinimize2 className="w-4 h-4 text-gray-500" />\n          </button>\n          <button onClick={handleClearChat} title="مسح المحادثة"`
);

// We find the last </div>
let lastIndex = c.lastIndexOf("</div>");
if (lastIndex !== -1) {
  c = c.substring(0, lastIndex) + "</motion.div>\n        )}\n      </AnimatePresence>\n    </>" + c.substring(lastIndex + 6);
}

fs.writeFileSync('src/app/components/Chat/ChatWidget.jsx', c);
