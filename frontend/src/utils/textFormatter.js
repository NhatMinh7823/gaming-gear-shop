// textFormatter.js - Utility để format text từ markdown sang JSX
import React from "react";

/**
 * Format text với markdown syntax thành JSX elements
 * Hỗ trợ:
 * - **text** -> <strong>text</strong> (in đậm)
 * - *text -> <li>text</li> (list item)
 * - Xuống dòng -> <br/>
 */
export const formatMessageText = (text) => {
  if (!text || typeof text !== "string") {
    return text;
  }

  // Tách text thành các dòng
  const lines = text.split("\n");
  const formattedElements = [];
  let currentListItems = [];
  let keyCounter = 0;

  const addCurrentList = () => {
    if (currentListItems.length > 0) {
      formattedElements.push(
        <ul
          key={`list-${keyCounter++}`}
          style={{
            margin: "8px 0",
            paddingLeft: "20px",
            listStyleType: "disc",
          }}
        >
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  lines.forEach((line, lineIndex) => {
    // Kiểm tra nếu dòng bắt đầu bằng * (list item)
    if (line.trim().startsWith("*") && !line.trim().startsWith("**")) {
      // Lấy text sau dấu *
      const listText = line.trim().substring(1).trim();
      if (listText) {
        // Format text trong list item (có thể có **bold**)
        const formattedListText = formatInlineText(listText);
        currentListItems.push(
          <li key={`item-${keyCounter++}`} style={{ marginBottom: "4px" }}>
            {formattedListText}
          </li>
        );
      }
    } else {
      // Nếu có list items đang pending, thêm vào trước
      addCurrentList();

      // Format dòng text thường (có thể có **bold**)
      if (line.trim()) {
        const formattedLine = formatInlineText(line);
        formattedElements.push(
          <div key={`line-${keyCounter++}`} style={{ marginBottom: "4px" }}>
            {formattedLine}
          </div>
        );
      } else if (lineIndex < lines.length - 1) {
        // Dòng trống (trừ dòng cuối)
        formattedElements.push(<br key={`br-${keyCounter++}`} />);
      }
    }
  });

  // Thêm list items cuối cùng nếu có
  addCurrentList();

  return formattedElements.length > 0 ? formattedElements : text;
};

/**
 * Format inline text - xử lý **bold** trong một dòng
 */
const formatInlineText = (text) => {
  if (!text.includes("**")) {
    return text;
  }

  const parts = [];
  let currentText = text;
  let keyCounter = 0;

  while (currentText.includes("**")) {
    const startIndex = currentText.indexOf("**");
    const endIndex = currentText.indexOf("**", startIndex + 2);

    if (endIndex === -1) {
      // Không tìm thấy ** đóng, trả về text gốc
      parts.push(currentText);
      break;
    }

    // Thêm text trước **
    if (startIndex > 0) {
      parts.push(currentText.substring(0, startIndex));
    }

    // Thêm text in đậm
    const boldText = currentText.substring(startIndex + 2, endIndex);
    parts.push(
      <strong key={`bold-${keyCounter++}`} style={{ fontWeight: "bold" }}>
        {boldText}
      </strong>
    );

    // Tiếp tục với phần còn lại
    currentText = currentText.substring(endIndex + 2);
  }

  // Thêm phần text còn lại
  if (currentText) {
    parts.push(currentText);
  }

  return parts;
};

/**
 * Alternative function - format đơn giản hơn nếu cần
 */
export const formatMessageTextSimple = (text) => {
  if (!text || typeof text !== "string") {
    return text;
  }

  return text.split("\n").map((line, index) => {
    // List items
    if (line.trim().startsWith("*") && !line.trim().startsWith("**")) {
      const listText = line.trim().substring(1).trim();
      return (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "flex-start",
            marginBottom: "4px",
          }}
        >
          <span style={{ marginRight: "8px" }}>•</span>
          <span>{formatBoldText(listText)}</span>
        </div>
      );
    }

    // Regular lines
    if (line.trim()) {
      return (
        <div key={index} style={{ marginBottom: "4px" }}>
          {formatBoldText(line)}
        </div>
      );
    }

    return <br key={index} />;
  });
};

/**
 * Helper function để format **bold** text
 */
const formatBoldText = (text) => {
  if (!text.includes("**")) {
    return text;
  }

  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return <strong key={index}>{boldText}</strong>;
    }
    return part;
  });
};

/**
 * Demo function để test formatting
 */
export const demoFormatting = () => {
  const sampleText = `Chào bạn! Tôi có thể giúp bạn tư vấn:

**Chuột Gaming Tốt Nhất:**
* Logitech G Pro X Superlight - **2.2 triệu VNĐ**
* Razer DeathAdder V3 - **1.8 triệu VNĐ**
* SteelSeries Rival 650 - **2.5 triệu VNĐ**

**Đặc điểm nổi bật:**
* DPI cao lên đến **25,600**
* Thiết kế ergonomic thoải mái
* RGB lighting **có thể tùy chỉnh**

Bạn có muốn xem thêm thông tin chi tiết không?`;

  return formatMessageText(sampleText);
};

export default { formatMessageText, formatMessageTextSimple, demoFormatting };
