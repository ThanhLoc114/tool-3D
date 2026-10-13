# Keycraft Studio

Tool dựng móc khóa 3D chạy trong trình duyệt. Giao diện tiếng Việt, mô hình theo mm.

## Chức năng riêng: Móc khóa từ ảnh

Mở `/image.html` hoặc chọn **Móc khóa từ ảnh** trên thanh chuyển chức năng. Trình chỉnh chữ cũ ở `/` vẫn hoạt động riêng.

- Tải PNG, JPG hoặc WEBP: tool tự xử lý nền, gom 2–5 màu và dựng đế + các mảng màu nổi. Không cần nhập lại chữ hoặc vẽ lại từng biểu tượng. Nút **Thử ảnh cà phê mẫu của bạn** dùng ảnh đã gửi trong cuộc trò chuyện này.
- PNG trong suốt và logo nhìn thẳng, nền đơn sắc cho kết quả rõ nhất. Ảnh được giảm về cạnh dài 720 pixel để lấy đường viền, làm mềm đường viền và bo từng vùng chi tiết riêng; chi tiết quá nhỏ vẫn có thể mất.
- Ảnh sản phẩm phối cảnh như mẫu cà phê tạo **phù điêu theo màu của vùng nhìn thấy**. Tool chưa tái tạo hình học 3D chính xác, sửa méo phối cảnh, suy ra mặt khuất hay tự thay chữ. Chữ và hình trong ảnh trở thành các mảng hình học; để sửa nội dung chữ, dùng tool chữ riêng.
- Trong **Chỉnh tách nền & chi tiết ảnh**, chỉnh mức tách nền, số màu, lọc các vùng nhỏ nếu bóng đổ hoặc nền bị lấy nhầm. Kiểm tra tab **Mảng màu đã tách** trước khi xuất.
- Chọn mảng màu làm đế hoặc thêm một đế màu riêng. Mỗi màu nổi có màu filament xem trước và độ dày riêng; các lớp nổi cùng bắt đầu trên mặt đế. Màu ảnh chỉ được gom theo thuật toán, không phải nhận diện đối tượng bằng AI.
- Chế độ lỗ tự động tìm vùng gần màu nền ở phía trái ảnh; nếu không tìm được thì thêm tai móc. Đây là gợi ý hình học, có thể nhầm với khoảng trống trong logo. Chọn thêm lỗ bên trái/phía trên hoặc không tạo lỗ nếu kết quả chưa đúng. Khi giữ lỗ trong ảnh, hai thông số đường kính và bề dày tai chỉ áp dụng nếu chuyển sang thêm lỗ mới.
- Tải 3MF hoặc bộ STL nhiều phần rồi gán filament trong Bambu Studio. Xuất file luôn dùng độ mịn đầy đủ. Kiểm tra Slice / Preview trước khi in; chưa kiểm chứng bằng in vật lý.
- Phân tích chạy trong Web Worker tại trình duyệt; ảnh không được gửi lên dịch vụ AI. Giới hạn 15 MB và 40 megapixel cho ảnh đầu vào.

`npm run test:image` kiểm tra nền trong suốt, nhiều màu, lỗ, độ dày, bề mặt kín, xuất/đọc lại STL, cấu trúc 3MF và ảnh cà phê thực tế. Bài kiểm tra tạo `artifacts/coffee-image-test.3mf` để xem thử.

## Chạy trên Windows

Yêu cầu Node.js 22 trở lên.

```powershell
npm install
npm run dev
```

Mở địa chỉ localhost mà terminal hiển thị. `npm run build` tạo bản production trong `dist`; `npm run preview` mở bản đó.

## Cách sử dụng

1. Chọn **Móc khóa chữ** để tạo tên như DUYEN. Tải ảnh tham khảo nếu muốn, bấm nhận diện chữ hoặc nhập tên thủ công. OCR nhận diện chữ Latin; dấu tiếng Việt cần kiểm tra lại.
2. Chọn một trong 6 font: Baloo 2 ExtraBold, Fredoka Bold, Nunito Black, Quicksand Bold, Lilita One, Noto Sans Bold. Baloo 2 là mặc định, phù hợp chữ tròn mập như ảnh mẫu. Lilita One chỉ dành cho chữ Latin không dấu; các font còn lại hỗ trợ tiếng Việt. Có thể thêm font TTF/OTF của bạn. Chưa hỗ trợ shaping chữ Ả Rập và font màu.
3. Chỉnh **Lớp 1 – độ dày đế** và **Lớp 2 – độ dày chữ** độc lập. Độ dày đã bao gồm phần bo; tổng chiều cao bằng tổng hai lớp. Điều chỉnh bo cạnh đế và bo cạnh chữ riêng, đặt 0 để tắt. Tool tự giảm bo khi lớp quá mỏng hoặc đường viền bị tách thành nhiều phần. Nút **Áp dụng kiểu mềm mại như mẫu** chọn Baloo 2, đế 2.4 mm, chữ 2 mm, bo đế 0.4 mm, bo chữ 0.7 mm và viền 2.8 mm. Đường kính lỗ là đường kính nhỏ nhất ở thân lỗ; mép bo có thể rộng hơn.

   Tất cả thông số số học có **thanh trượt + ô nhập số** đồng bộ hai chiều, kể cả ngưỡng tách ảnh. Mô hình cập nhật trong lúc kéo, không chờ dừng thao tác. Bản xem khi kéo giảm số phân đoạn bo để nhẹ hơn; khi thả sẽ dựng lại bản mịn. Xuất STL/3MF luôn dựng bản đầy đủ. Tốc độ xem trước phụ thuộc máy và độ phức tạp mô hình. Khung 3D giữ trong tầm nhìn khi cuộn bảng thông số; trên màn hình nhỏ, khung xem thu gọn ở phía trên.
4. Xoay mô hình để kiểm tra. Màu chỉ là màu xem trước và vật liệu trong 3MF.
5. Tải **3MF** hoặc bộ **STL**. Trong Bambu Studio, nhập 3MF như mô hình hình học (không phải project chứa profile máy). Gán filament riêng cho đế và chữ. Nếu dùng STL, chọn cả De.stl và Chu.stl cùng lúc và nhập thành một đối tượng nhiều phần; giữ nguyên vị trí tương đối.
6. Chọn profile máy in của bạn trong Bambu Studio, Slice và kiểm tra Preview. Chưa kiểm chứng bằng in vật lý hoặc nhập bằng Bambu Studio trên máy này.
7. Lưu JSON để sửa tiếp; file lưu cả ảnh tham khảo và font tùy chỉnh nếu có.

## Phạm vi hiện tại

- Dựng chữ thành lớp nổi trên đế có viền. Các phần đế rời được nối bằng cầu đỡ.
- Chế độ **Ảnh / logo phẳng** tách hình bằng ngưỡng độ sáng, lấy đường viền và đùn thành phù điêu một lớp nổi. Xử lý ảnh tối đa 240 pixel ở cạnh dài, vì vậy đường viền có thể có bậc thang.
- Ảnh 3D phối cảnh như ảnh AI có bóng đổ **không thể được khôi phục chính xác tự động** ở bản này. Chế độ chữ dựng lại theo tên và font bạn chọn, không suy ra font/độ bo từ ảnh. Chữ nằm trong ảnh ở chế độ logo vẫn là hình; muốn sửa nội dung phải chuyển sang chế độ chữ.
- Bo cạnh được dựng vào hình học thực và xuất trong STL/3MF. Mặt chữ có phần phẳng ở giữa và mép bo, chưa tái tạo chính xác độ cong hoặc font trong ảnh AI. Chưa tự tách nhiều màu từ ảnh.
- OCR chạy bằng Tesseract trong trình duyệt và tải worker/model từ Internet lần đầu. Ảnh không được gửi tới dịch vụ AI. Font giao diện Google Fonts cũng cần mạng; font tạo mô hình được đóng gói cục bộ.
- File 3MF chứa hai phần hình học cùng tọa độ và màu cơ bản, không có cấu hình AMS, G-code hay profile máy in.

Các font được phân phối theo SIL Open Font License; giấy phép nằm trong `public/fonts`. Font được đóng gói cục bộ, không cần mạng khi chọn. `scripts/fetch_fonts.py` tải font nguồn từ kho Google Fonts và dùng fontTools để tạo bản tĩnh đúng độ đậm; đây là công cụ bảo trì, không cần Python để chạy app.

`npm test` kiểm tra bề mặt kín, chiều cao lớp, vị trí tiếp xúc giữa hai lớp, chữ có dấu, chế độ ảnh và các font. `npm run build` kiểm tra bản production.


Trong tool ảnh, bật **Chọn mảnh để xóa**, bấm một mảnh nổi trên mô hình, kiểm tra phần tô cam rồi bấm **Xóa mảnh đã chọn**. **Hoàn tác** khôi phục lần xóa gần nhất. Xóa áp dụng theo cả mảnh liên thông, giữ lại đế và áp dụng cho STL/3MF. Chỉnh kích thước vẫn giữ dấu xóa; tải ảnh mới hoặc chạy lại tách ảnh sẽ đặt lại lịch sử xóa. Tắt chế độ chọn để xoay mô hình.

## Clicker MX từ ảnh
Mở /clicker.html hoặc tab Clicker từ ảnh. Tải ảnh để tạo mặt nút, socket chữ thập và thân switch mở đáy. Các phần đặt tách rời để in, chưa phải hình lắp ráp. Có chỉnh độ hở ngàm và lỗ plate. Cần switch MX thông thường mua riêng, chưa hỗ trợ low-profile. Hình phải có phần giữa đủ rộng giữ ngàm. Kiểm tra support cho mặt nút và in thử độ khít trước; chưa xác nhận bằng in/lắp vật lý. STL có hướng dẫn riêng trong ZIP.

Clicker cập nhật: vỏ có đáy, khoang switch, plate và viền bao theo đường bao mặt nút; tai móc khóa nằm trên vỏ. Kích thước MX cố định, chọn 1–4 switch; tool tự tìm vị trí đủ chỗ và tạo ngàm tương ứng. Hình nhỏ sẽ báo tăng chiều rộng. Khe chạy quanh mặt nút 0.4 mm, thành vỏ 2 mm. Các phần vẫn đặt tách rời để in. Chạy node tests/clicker-shell.mjs để kiểm tra vỏ kín với 1–4 switch. Chưa kiểm chứng lắp ráp/in vật lý.

Vỏ clicker: đáy tăng lên 2.4 mm; viền bao mặt tăng lên 5.5 mm. Plate được nâng cùng đáy để giữ nguyên khoảng trống chân switch. Khe quanh mặt nút giữ 0.4 mm. Tổng chiều cao vỏ 18.8 mm; vẫn cần kiểm tra hành trình và độ khít khi in thực tế.

Cấu tạo nắp clicker cập nhật: mặt dưới có viền khay úp dày 1.2 mm, sâu 2 mm và trụ ngàm tròn có lỗ chữ thập MX. Vỏ có khoang rỗng dưới plate. Nút Xem mặt dưới nắp lật riêng nắp trong bản xem để kiểm tra như hình CAD; xuất file vẫn dùng tọa độ gốc. Hành trình nominal được chừa khoảng, chưa thử với linh kiện và bản in thực tế.

Làm mịn vỏ: dùng trực tiếp đường bao nắp thay vì ghép tam giác mặt bo; lọc đường bao ở độ lệch 0.12 mm trước khi làm mềm. Ánh sáng giữ mặt phẳng và làm mịn thành cong, đồng bộ pháp tuyến giữa các tầng vỏ. Đường bao mới cũng áp dụng vào STL/3MF.

Viền khay dưới nắp hiện cao 4.5 mm, bằng trụ ngàm MX. Vỏ có rãnh chạy quanh plate để viền xuống sâu khi bấm, và khung đỡ plate nối xuống đáy. Cần thêm khoảng đặt switch nên một số hình nhỏ có thể yêu cầu tăng chiều rộng mặt nút.

Liền khối: vỏ được Boolean Union 3D bằng Manifold, xuất thành Vo_Lien_Khoi; đáy, thành, plate và khung đỡ không còn các mặt nội bộ chồng lên nhau. Kết cấu nắp (đế, viền khay, trụ MX) cũng hợp thành một solid. Mảng màu trang trí vẫn riêng để gán filament. Bộ tính hình học WASM được đóng gói cục bộ.

Tai móc clicker: vị trí nối lấy từ giao điểm thật của đường bao tại chiều cao tai móc, thêm cổ nối rộng 6 mm. Kiểm tra cả union 2D và một thành phần liên thông 3D để không xuất tai móc rời trên hình lõm.

### QR từ ảnh
- Mở `/qr.html`: tải ảnh QR nhìn thẳng để đọc nội dung, hoặc nhập văn bản/URL tạo QR mới. Xử lý cục bộ bằng jsQR và qrcode; không gửi ảnh đi.
- 6 mẫu đế, 4 kiểu khung, khoen liền đế, màu từng phần. Thanh trượt kèm ô số cập nhật 3D trực tiếp.
- QR có vùng trắng 4 module; mã và nền cùng độ cao, không chồng thể tích. Kiểm tra đọc lại ảnh QR trước khi bật xuất. Bản in cần quét thử thực tế; nên giữ module ít nhất 0.8 mm.
- Xuất 3MF nhiều phần màu, STL ZIP và ảnh PNG. Đây là chức năng đọc ảnh QR, không tự biến ảnh minh họa bất kỳ thành QR.
- Kiểm tra: `node tests/qr-tool.mjs` (24 tổ hợp, đọc lại nội dung, xuất STL/3MF), `npm run build`.

#### Kiểu dùng QR
Mặc định là tấm phẳng không khoen để dán tường. Chọn bệ đứng để thêm chân rời có khe rộng hơn bảng 0,5 mm, sâu 5 mm; bản xem có chế độ lắp ghép và file xuất luôn trải riêng bảng/bệ để in. Có thể chỉnh chiều sâu bệ. Khoen là một tùy chọn sử dụng riêng.
Wi-Fi có biểu mẫu SSID/mật khẩu/bảo mật/mạng ẩn, escape ký tự phân cách. Chuyển tiền dùng ảnh QR ngân hàng/ví hoặc payload gốc; không tạo dữ liệu ngân hàng từ số tài khoản. Kiểm tra người nhận/số tiền trong ứng dụng ngân hàng. Bệ và khe chưa được thử in vật lý.

### Kỷ niệm bé sơ sinh
`/baby.html`: mẫu vector trăng, em bé, gấu và 4 ô thông tin. Tên, ngày giờ sinh, cân nặng, chiều dài là chữ 3D độc lập hỗ trợ tiếng Việt; 4 font, màu từng phần, kích thước và độ dày có thanh trượt/ô số. Lưu và mở thiết kế JSON. Mẫu lấy cảm hứng bố cục ảnh tham chiếu, không sao chép chính xác minh họa gốc.
Bệ đứng in riêng, khớp lưỡi 16 mm sâu 5 mm giữ kích thước khi thay đổi chiều rộng bảng. 3MF chung có hai đối tượng; có nút tải riêng bảng và bệ. Chưa thử in/lắp vật lý. Kiểm tra: `node tests/baby-tool.mjs` và `npm run build`.

Cập nhật mẫu kỷ niệm: thay minh họa hình học đơn giản bằng đường viền tách trực tiếp từ ảnh tham chiếu của người dùng (`src/baby-reference.json`). Giữ dáng bảng, bé ngủ, gấu, trăng, biểu tượng và khung gốc. Loại chữ cũ khỏi minh họa để tên và số liệu vẫn dựng riêng, chỉnh được. Ảnh gradient được chuyển thành bốn mảng màu phẳng để in.

Làm mượt khung kỷ niệm: đường bao ảnh được lọc bước răng cưa 0,1 mm và chia đường cong hai lượt. Bốn khung thông tin được dựng lại bằng hình chữ nhật bo tròn có viền đều 0,8 mm, thay các đường viền raster; bo mặt viền 0,24 mm và cạnh bảng 0,55 mm. Chữ và nét mặt giữ nguyên.
Lọc tạp mẫu bé: giới hạn vùng minh họa/biểu tượng, loại phần sót từ chữ và khung gốc; bỏ mảnh dưới 0,25 mm² và thanh không giữ được lõi rộng 0,18 mm. Lọc lại sau phép trừ màu; không áp dụng lọc này lên chữ tùy chỉnh.


## Nâng cấp giao diện và tiện ích

Thanh điều hướng chung kết nối 6 công cụ. Mỗi công cụ thiết kế có 6 phong cách phối màu/bố cục, nút Vừa khung và giữ góc nhìn khi chỉnh thông số. Logo và clicker có 5 ảnh mẫu (cà phê, ngôi sao, hoa, gấu trúc, robot), 4 kiểu thân. Bảng bé có đường bao theo mẫu hoặc chữ nhật bo góc; phông thiếu ký tự dùng Noto Sans cho dòng đó.

Dựng logo, clicker, QR và bảng bé chạy trong Web Worker, chỉ giữ một yêu cầu chờ mới nhất. Hình minh họa bảng bé được lưu bộ nhớ đệm. Khung nhìn render khi thay đổi và tạm dừng khi tab bị ẩn. Mô hình phức tạp vẫn cần thời gian tính hình học; chờ nút xuất được bật để tải chất lượng cuối.

Trang `print-tools.html` có mẫu thử dung sai chốt/lỗ, khối 20 mm và vách mỏng, xuất STL ZIP/3MF; tính chi phí nhựa và điện; kiểm tra vừa bàn in theo kích thước nhập; ước tính chiều dài filament từ khối lượng trừ lõi. Mẫu dung sai có 5 lỗ từ trái sang phải và hai thanh in riêng. Mẫu thử dùng để chọn khe hở thực tế trước khi in sản phẩm có khớp.


## Ảnh thành vật thể 3D và hốc LED 001

Mở `lamp.html`. Dùng TripoSR chạy CPU trên máy (RTX 3050 Ti 4 GB chưa dùng GPU), hoặc nhập GLB/STL. AI tái dựng vật thể nhìn được mọi phía nhưng ước đoán các phần không thấy trong ảnh. Không phải mô hình CAD chính xác hay tự tạo chụp đèn rỗng.

Cài bằng `powershell -File scripts/setup-local3d.ps1`, rồi `npm run dev -- --port 5174`. Python môi trường riêng và trọng số nằm trong `.local-ai/`, không đưa vào Git. Trọng số TripoSR khoảng 1,56 GB, tải có thể lâu; script tải chia đoạn có thể chạy lại để tiếp tục. Ảnh xử lý cục bộ. Khi bộ model/thư viện chưa sẵn sàng, nút AI bị khóa. Vite dev server có API cục bộ; bản build tĩnh chỉ có nhập mô hình và chỉnh hốc.

Chọn/kéo dấu tròn trên bề mặt, chỉnh sâu hốc/dung sai, bấm Khoét. Ø59 mm cố định, sâu mặc định 8 mm; đo đèn thực tế trước khi in. Đế giữ hốc được gắn với thân bằng boolean, bám theo bề mặt cong. Nắp đáy riêng có gờ lắp ma sát 2,8 mm và rãnh dây 6 mm. Hai phần xuất riêng trong 3MF/STL ZIP. Các vị trí quá mỏng, quá hẹp và mesh không kín được chặn. Hoàn tác để đổi hốc. Cần in thử khớp; chưa thử lắp đèn vật lý.

Nguồn model: https://github.com/VAST-AI-Research/TripoSR (MIT). Kích thước sản phẩm tham khảo: https://au.store.bambulab.com/products/led-lamp-kit-001 . Kiểm tra mới: `node tests/lamp-tool.mjs`.

## Clicker thanh long
Trang fruit.html dựng mẫu thanh long 3D tham số: vỏ cong, khoen liền, tai xanh, nút ruột và hạt; một switch MX. Ảnh tải lên dùng để lấy màu hồng/xanh và đối chiếu, không phải tái dựng hình học AI tùy ý. Thanh trượt cập nhật qua worker. 3MF có hai đối tượng nhiều màu để in riêng; nút quay chân lên. Kiểm tra bằng node tests/fruit-tool.mjs. Cần in thử độ khít và hành trình thực tế.


## 100 phông chữ
Tool móc khóa chữ giữ sáu mẫu thiết kế trước đó và có 100 họ phông để chọn. Tìm theo tên, lọc nhóm, rồi chọn phông cụ thể trong danh sách Chọn phông chữ. 94 phông bổ sung lưu cục bộ cùng giấy phép OFL; chỉ tải khi chọn. Ký tự thiếu dùng Noto Sans dự phòng. Kiểm tra bằng `node tests/font-catalog.mjs`.

## Kiểm tra và vận hành
`npm ci`, `npm run dev -- --port 5174 --strictPort` để chạy local. `npm run build` và `npm run preview -- --port 5174` để thử bản đóng gói. `npm run test:all` kiểm tra các tool, hình học kín, kết nối clicker/đế, QR, màu 3MF và vòng vẽ tiết kiệm khi trang đứng yên. Nhật ký nằm trong artifacts (không đưa lên Git).
Các trang có nền sáng và trạng thái chờ trước JavaScript, chuyển cảnh ngắn trên trình duyệt hỗ trợ View Transitions; giữ liên kết/history chuẩn. GPU chỉ vẽ khi cần, pixel ratio tối đa 1.5. OCR chỉ tải khi bấm nhận diện. Chữ chỉ thay bản xem trước khi dựng mới hoàn tất.
AI từ ảnh cần hoàn thành cài đặt/trọng số và kiểm chứng TripoSR; kiểm tra tại `/api/local3d/ready`. Khi chưa sẵn sàng, nhập GLB/STL để dùng hốc đèn. Các phép kiểm tra tự động không thay thế bản in thử dung sai MX/LED và kiểm tra Slice trong Bambu Studio.

### AI cục bộ đã kiểm chứng
TripoSR đã chạy thử ảnh ghế và hamburger qua API local; đầu ra GLB được kiểm tra bề mặt kín và đọc bằng GLTFLoader của giao diện. Trọng số, cấu hình DINO và u2netp lưu trong `.local-ai/`; sau cài đặt và kiểm chứng, API dùng Hugging Face cache ở chế độ offline. Khâu hậu xử lý bỏ mảnh rời nhỏ bằng cách giữ khối có diện tích lớn nhất, vá lỗ nhỏ và sửa hướng mặt. Chi tiết rời chủ ý có thể bị bỏ; dùng ảnh một vật thể liền khối. AI ước đoán mặt khuất, không đảm bảo giống hoàn toàn ảnh hoặc tự tạo kết cấu in chính xác.
Trên máy khác, chạy script setup để tải model và kiểm chứng; GitHub không chứa trọng số 1.56 GiB hoặc môi trường Python. Dùng trang `lamp.html`, tải PNG/JPG, bấm Tạo 3D bằng AI cục bộ. Chạy CPU nên cần chờ; có nút dừng và tiếp tục theo dõi sau khi tải lại trang.

Trang đèn có thanh Làm mịn bề mặt 0–40: Taubin trong worker, giữ kích thước bao và áp dụng vào STL/3MF. TripoSR và Hunyuan cũ chưa tái chia lưới mặc định 18; Hunyuan đã làm sạch và mô hình nhập giữ mức 0. Chỉnh trước khi khoét hốc. Mức mạnh làm mờ chi tiết; không phục hồi chi tiết AI dựng sai.

### Hunyuan3D-2mini Turbo cục bộ
Trang `lamp.html` có lựa chọn Hunyuan3D-2mini Turbo để dựng hình qua 5 bước suy luận, cùng lựa chọn TripoSR. Không cần API key hay credit; ảnh không gửi ra ngoài. Chỉ tải mã nguồn và trọng số chính thức lúc cài đặt. Model shape-only khoảng 3,8 GB, được kiểm tra SHA256; môi trường Python riêng giữ TripoSR hoạt động độc lập.

Trên Windows/Python 3.12, chạy `powershell -File scripts/setup-hunyuan.ps1`, sau đó `powershell -File scripts/verify-hunyuan.ps1 -Image "duong-dan-anh.png"`. Bộ AI chỉ được bật sau khi chạy thật và kiểm tra một GLB kín. Trên máy này dùng CPU, nạp từng giai đoạn để giảm RAM; lần chạy đầu còn biên dịch thư viện tách nền. Không chạy suy luận trực tiếp trên RTX 3050 Ti 4 GB.

Chọn **Hunyuan3D-2mini Turbo** trong Bộ AI dựng hình. **Thử nhanh** dùng độ phân giải bề mặt 127, **Chi tiết** dùng 255 và tốn thời gian hơn. Hunyuan mới tự lọc mảnh rời rất nhỏ, tái chia đều lưới và lọc gợn hình học trước khi xuất. Thanh Làm mịn giữ mức 0 cho bản đã xử lý để không lọc chồng quá mức; có thể điều chỉnh thêm. Bản GLB trước xử lý giữ trong tệp `.raw.glb` trên máy. Pháp tuyến liên tục dành cho mô hình AI tránh tạo vạch sắc giả tại vùng tiếp giáp; mô hình cơ khí giữ cách hiển thị cạnh sắc. Đây là hình học, chưa có bộ tạo texture hoặc phân màu filament AI. Mặt khuất được ước đoán, không bảo đảm chất lượng ngang dịch vụ thương mại hoặc tái tạo chính xác ảnh. Hốc LED và nắp tiếp tục dùng cùng công cụ sau khi dựng.

Suy luận được cache theo ảnh, phiên bản model và seed trên máy; tạo lại cùng ảnh ở độ phân giải khác có thể dùng lại latent. Cache hỏng được giữ riêng để chẩn đoán và dựng lại. Tác vụ lưu engine, PID và tiến độ để tiếp tục theo dõi sau khi máy chủ web khởi động lại. Dừng tác vụ kiểm tra đúng tiến trình trước khi kết thúc cả cây Python trên Windows. GLB được ghi vào tệp tạm rồi đổi tên, tránh tải phải tệp chưa ghi xong.

Nguồn và giấy phép: [Tencent Hunyuan3D-2](https://github.com/Tencent-Hunyuan/Hunyuan3D-2), [trọng số và giấy phép Hunyuan3D-2mini](https://huggingface.co/tencent/Hunyuan3D-2mini). Trọng số và thư viện AI không đưa lên GitHub. Vite bỏ theo dõi `.local-ai` và `artifacts`, chỉ quét các trang tool để môi trường AI lớn không gây khựng web.

Đã kiểm chứng trên ảnh nhân vật xanh: mức Chi tiết tạo 345.770 tam giác, một khối kín; mở bằng giao diện, làm mịn và xuất 3MF thành công. Hốc Ø59 mm sâu 12 mm và nắp rời được kiểm tra bằng Manifold. Trích xuất mức Chi tiết từ latent đã lưu mất 367 giây trên CPU máy này; ảnh mới còn cần phân tích ảnh và suy luận nên lâu hơn. Độ phân giải cao giảm gợn thật trên hình học; pháp tuyến tính theo diện tích tam giác giúp hiển thị đúng mặt cong, giữ cạnh sắc và không đổi tọa độ mô hình. Bản vá decoder giữ tọa độ mẫu dạng số thực, tránh lỗi ép bước lấy mẫu nhỏ thành số nguyên 0 ở bản upstream đã ghim.

Làm sạch bề mặt AI: remesh 5 lượt với cạnh tương đương 0,8 mm ở chiều rộng 120 mm, lọc Taubin 30 bước và giữ kích thước bao. Chỉ bỏ mảnh rời có diện tích dưới 0,1% khối lớn nhất; các phần nhô liền khối được giảm gợn qua remesh. Kiểm tra lại tọa độ và bề mặt kín trước khi thay GLB, giữ bản gốc. Trên mẫu nhân vật hiện tại, 345.770 mặt được tái chia thành 246.536 mặt; vẫn một khối kín, khoét hốc và xuất 3MF đạt. Kiểm tra fixture nhiễu/mảnh tạp bằng `.local-ai/hunyuan-venv/Scripts/python.exe tests/ai-surface.py`.
