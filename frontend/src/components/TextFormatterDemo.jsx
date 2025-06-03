// TextFormatterDemo.jsx - Component demo để test text formatting
import React, { useState } from 'react';
import { formatMessageText, formatMessageTextSimple } from '../../utils/textFormatter';

const TextFormatterDemo = () => {
    const [inputText, setInputText] = useState(`Chào bạn! Tôi có thể giúp bạn tư vấn:

**Chuột Gaming Tốt Nhất:**
* Logitech G Pro X Superlight - **2.2 triệu VNĐ**
* Razer DeathAdder V3 - **1.8 triệu VNĐ**
* SteelSeries Rival 650 - **2.5 triệu VNĐ**

**Đặc điểm nổi bật:**
* DPI cao lên đến **25,600**
* Thiết kế ergonomic thoải mái
* RGB lighting **có thể tùy chỉnh**

Bạn có muốn xem thêm thông tin chi tiết không?`);

    const [useSimpleFormat, setUseSimpleFormat] = useState(false);

    const sampleTexts = [
        {
            name: "Tư vấn chuột gaming",
            text: `**Chuột Gaming Tốt Nhất cho bạn:**

* Logitech G Pro X Superlight - **2.2 triệu VNĐ**
* Razer DeathAdder V3 - **1.8 triệu VNĐ**
* SteelSeries Rival 650 - **2.5 triệu VNĐ**

**Thông số kỹ thuật:**
* DPI: **25,600 DPI**
* Trọng lượng: **63g**
* Connectivity: **Wireless 2.4GHz**`
        },
        {
            name: "Thương hiệu gaming",
            text: `**Các thương hiệu Gaming phổ biến:**

**Logitech:**
* Chất lượng cao, độ bền tốt
* Giá cả **phù hợp với đa số người dùng**
* Hỗ trợ phần mềm **Logitech G HUB**

**Razer:**
* Thiết kế gaming chuyên nghiệp
* RGB **Chroma** đẹp mắt
* Hiệu năng **đỉnh cao** cho esports`
        },
        {
            name: "Setup gaming",
            text: `**Setup Gaming hoàn chỉnh 20 triệu:**

**Cấu hình đề xuất:**
* CPU: **AMD Ryzen 5 5600X** - 5.5 triệu
* GPU: **RTX 3060 Ti** - 8 triệu
* RAM: **16GB DDR4 3200MHz** - 1.5 triệu
* SSD: **500GB NVMe** - 1.2 triệu

**Phụ kiện gaming:**
* Chuột: **Logitech G Pro** - 1.5 triệu
* Bàn phím: **Corsair K70** - 2.3 triệu

Tổng: **20 triệu VNĐ**`
        }
    ];

    return (
        <div style={{
            padding: '20px',
            maxWidth: '1200px',
            margin: '0 auto',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h1 style={{ textAlign: 'center', color: '#3b82f6' }}>
                Text Formatter Demo
            </h1>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px'
            }}>
                {/* Input Panel */}
                <div>
                    <h3>Input Text (Markdown format):</h3>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        style={{
                            width: '100%',
                            height: '300px',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontFamily: 'monospace',
                            fontSize: '12px'
                        }}
                        placeholder="Nhập text với **bold** và *list items..."
                    />

                    <div style={{ marginTop: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                checked={useSimpleFormat}
                                onChange={(e) => setUseSimpleFormat(e.target.checked)}
                            />
                            Use Simple Format (thay vì full format)
                        </label>
                    </div>
                </div>

                {/* Output Panel */}
                <div>
                    <h3>Formatted Output:</h3>
                    <div style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '15px',
                        backgroundColor: '#f9f9f9',
                        minHeight: '300px',
                        fontSize: '14px',
                        lineHeight: '1.4'
                    }}>
                        {useSimpleFormat
                            ? formatMessageTextSimple(inputText)
                            : formatMessageText(inputText)
                        }
                    </div>
                </div>
            </div>

            {/* Sample Texts */}
            <div>
                <h3>Sample Texts để test:</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '15px'
                }}>
                    {sampleTexts.map((sample, index) => (
                        <button
                            key={index}
                            onClick={() => setInputText(sample.text)}
                            style={{
                                padding: '10px',
                                border: '1px solid #3b82f6',
                                borderRadius: '8px',
                                backgroundColor: '#f0f9ff',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '12px'
                            }}
                        >
                            <strong>{sample.name}</strong>
                            <div style={{ marginTop: '5px', opacity: 0.7 }}>
                                {sample.text.substring(0, 100)}...
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Usage Instructions */}
            <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #3b82f6'
            }}>
                <h3 style={{ color: '#3b82f6' }}>Cách sử dụng:</h3>
                <ul style={{ lineHeight: '1.6' }}>
                    <li><strong>**text**</strong> sẽ được format thành <strong>text in đậm</strong></li>
                    <li><strong>*text</strong> (bắt đầu dòng) sẽ tạo list item</li>
                    <li>Xuống dòng sẽ tạo khoảng cách giữa các đoạn</li>
                    <li>Có thể kết hợp: <strong>*Item có **bold** text</strong></li>
                </ul>

                <h4 style={{ color: '#3b82f6', marginTop: '15px' }}>Import và sử dụng:</h4>
                <pre style={{
                    backgroundColor: '#1f2937',
                    color: '#10b981',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>
                    {`import { formatMessageText } from '../../utils/textFormatter';

// Trong component:
{message.sender === 'bot' ? formatMessageText(message.text) : message.text}`}
                </pre>
            </div>
        </div>
    );
};

export default TextFormatterDemo;
