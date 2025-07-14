# File: backend/services/chatbotService.js

## Tổng quan

`chatbotService.js` là service chính phía backend chịu trách nhiệm xử lý logic chatbot cho dự án gaming-gear-shop. File này quản lý session người dùng, phát hiện workflow, sử dụng tool theo context, và tích hợp với nhiều manager (agent, chat history, vector store, workflow, ...) để xử lý tin nhắn và điều phối hành vi của chatbot.

---

## Chức năng chính

- **Khởi tạo**: Thiết lập agent, vector store, tool, và nạp dữ liệu sản phẩm.
- **Quản lý context người dùng**: Xử lý context cá nhân hóa cho từng người dùng.
- **Phát hiện & quản lý workflow**: Phát hiện ý định (mua hàng, tìm kiếm, wishlist, ...) và quản lý các workflow nhiều bước.
- **Quản lý tool**: Tạo mới và cập nhật tool với context người dùng phù hợp cho từng request.
- **Xử lý order flow**: Điều phối các hội thoại liên quan đến đặt hàng và fallback khi cần.
- **Lưu lịch sử chat**: Quản lý lịch sử hội thoại theo session/người dùng.
- **Xử lý lỗi**: Ghi log lỗi và fallback sang gọi LLM trực tiếp nếu agent gặp sự cố.

---

## Các thành phần & phương thức chính

### 1. **Khởi tạo**

- `initialize()`: Thiết lập các manager, nạp sản phẩm vào vector store, khởi tạo tool, tạo agent với các tool đó.
- `ensureInitialized()`: Đảm bảo service đã được khởi tạo trước khi xử lý tin nhắn.

### 2. **Xử lý tin nhắn**

- `processMessage(message, sessionId, userId)`:
  - Đảm bảo đã khởi tạo.
  - Thiết lập context người dùng và cập nhật tool.
  - Khởi tạo hoặc tiếp tục workflow dựa trên ý định.
  - Xử lý order flow nếu phù hợp.
  - Gọi agent để lấy phản hồi.
  - Cập nhật lịch sử chat và trạng thái workflow.
  - Trả về kết quả có kèm analytics.

### 3. **Context người dùng & Tool**

- `createFreshToolsAndUpdateAgent()`:

  - Tạo mới các tool với context người dùng hiện tại.
  - Cập nhật agent với các tool này.
  - Kiểm tra lại context của tool.
  - Nếu lỗi thì fallback sang phương thức legacy.

- `updateToolsUserContextLegacy()`:
  - Cập nhật context cho tool theo cách cũ nếu cần.

### 4. **Phát hiện workflow & ý định**

- `detectWorkflowIntent(message)`:

  - Dùng regex để phát hiện ý định: mua hàng, wishlist, duyệt danh mục, tìm kiếm...
  - Trả về loại workflow hoặc null.

- `hasProductKeywords(message)`:

  - Kiểm tra tin nhắn có chứa từ khóa sản phẩm, thương hiệu, gaming không.

- `shouldUseCompleteWorkflow(message, workflowIntent)`:
  - Quyết định dùng workflow đầy đủ hay chỉ order flow dựa trên ý định và từ khóa.

### 5. **Quản lý trạng thái workflow**

- `updateWorkflowBasedOnResult(sessionId, result, toolsUsed)`:

  - Tiến trình workflow dựa trên tool đã dùng và output của agent.
  - Đánh dấu hoàn thành hoặc hủy workflow nếu cần.

- `isWorkflowComplete(intermediateSteps)`:
  - Kiểm tra chuỗi tool đã dùng có khớp với pattern workflow hoàn chỉnh nào không.

---

## Tích hợp với các thành phần khác

- **AgentManager**: Quản lý agent và tool của chatbot.
- **ChatHistoryManager**: Lưu và truy xuất lịch sử chat theo session/người dùng.
- **VectorStoreManager**: Xử lý dữ liệu sản phẩm cho tìm kiếm ngữ nghĩa.
- **WorkflowStateManager**: Theo dõi và cập nhật tiến trình workflow.
- **OrderFlowManager**: Xử lý các flow liên quan đến đặt hàng.
- **UserContext**: Lưu thông tin người dùng hiện tại để cá nhân hóa phản hồi.
- **Tools**: Các chức năng modular (tìm kiếm, wishlist, giỏ hàng, ...).

---

## Xử lý lỗi & fallback

- Nếu agent gặp lỗi, service sẽ fallback sang gọi LLM trực tiếp để trả lời cơ bản.
- Nếu cập nhật tool lỗi, sẽ dùng phương thức legacy để đảm bảo context vẫn đúng.

---

## Mở rộng

- Có thể thêm workflow, tool, hoặc pattern ý định mới bằng cách cập nhật các phương thức và regex liên quan.
- Cấu trúc manager tách biệt giúp dễ tích hợp thêm tính năng hoặc dịch vụ ngoài.

---

## Cách sử dụng

Service này thường được import và sử dụng như singleton phía backend, với phương thức chính là `processMessage` để xử lý hội thoại chatbot.

---

## Tóm tắt

`chatbotService.js` là service trung tâm, mạnh mẽ, dễ mở rộng và nhận biết context, điều phối toàn bộ logic AI chatbot cho gaming-gear-shop: từ khởi tạo, context người dùng, workflow, tool, đến xử lý lỗi và analytics.
