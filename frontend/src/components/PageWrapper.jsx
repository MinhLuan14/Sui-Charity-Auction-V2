import { motion } from "framer-motion";

// Đây là một "Hộp bao bọc" có khả năng chuyển động
const PageWrapper = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}    // Trạng thái khi vừa xuất hiện (mờ và hơi thấp xuống)
      animate={{ opacity: 1, y: 0 }}     // Trạng thái hiển thị (hiện rõ và bay lên vị trí chuẩn)
      exit={{ opacity: 0, y: -20 }}      // Trạng thái khi biến mất (mờ dần và bay lên trên)
      transition={{ duration: 0.4, ease: "easeOut" }} // Thời gian chạy hiệu ứng 0.4 giây
    >
      {children}
    </motion.div>
  );
};

export default PageWrapper;