// Hướng dẫn chơi (Tiếng Việt). Cấu trúc giống en.js.
export const HELP = {
  title: 'Hướng dẫn chơi',
  intro: 'Mọi thứ bạn cần cho chuyến đi Seoul. Chạm vào một chủ đề để mở.',
  sections: [
    { icon: '🚶', title: 'Di chuyển', lines: [
      'Điện thoại: kéo cần điều khiển ở góc dưới bên trái để đi. Kéo màn hình để nhìn quanh, chụm hai ngón để phóng to.',
      'Máy tính: W A S D để đi, Shift để chạy, kéo chuột để nhìn, lăn chuột để phóng to. V để xem góc nhìn thứ nhất.',
      'Đến gần cửa hoặc người rồi chạm nút lớn (E hoặc Space) để vào hoặc nói chuyện.',
      'Biểu cảm: nút biểu cảm hoặc phím 1–9. Esc để đóng cửa sổ.',
    ] },
    { icon: '🗺️', title: 'Bản đồ và đi lại', lines: [
      '🗺️ Bản đồ: tìm cửa hàng, món ăn hoặc sản phẩm. Chạm vào một nơi, tự động đi bộ sẽ đưa bạn đến miễn phí.',
      '🛵 Phương tiện: xe đạp công cộng miễn phí và nhanh hơn đi bộ nhiều. Xe nhanh hơn có bán ở cửa hàng xe đạp.',
      '🚇 Tàu điện ngầm: đi xuống cầu thang ga và trả tiền ở cửa soát vé. 🚕 Taxi: chọn nơi trên bản đồ; bạn bè đứng cạnh sẽ chia tiền xe.',
      '⛴️ Taxi thuyền sông Hàn nối các công viên ven sông, và 🚡 cáp treo lên Namsan.',
    ] },
    { icon: '🪙', title: 'Cách kiếm tiền', lines: [
      '📅 Điểm danh mỗi ngày, và hoàn thành ba nhiệm vụ hôm nay để nhận thưởng.',
      'Hướng dẫn viên ở quảng trường và Trung tâm thông tin giao nhiệm vụ nhỏ. Làm xong rồi quay lại báo cáo.',
      'Làm việc: giao đồ ăn cho cửa hàng, làm ở quán pocha, minigame có huy chương, lớp nấu ăn.',
      'Câu cá ở sông Hàn rồi bán ở chợ cá.',
      'Bán quần áo không mặc ở cửa hàng đồ cũ, hoặc cho người chơi khác ở Chợ Khoai Tây Dongmyo.',
      'Tiền là won ảo, không có giá trị thật. Chạm vào tiền để xem ví.',
    ] },
    { icon: '🛍️', title: 'Mua sắm và phong cách', lines: [
      'Vào cửa hàng để xem, thử đồ và mua. Đồ đã mua nằm trong 🎒 Túi.',
      'Thay đồ trong Túi. Tiệm tóc, phòng khám thẩm mỹ và xưởng bảng tên thay đổi phần còn lại.',
      '⚙️ Cài đặt → Dịch biển hiệu cửa hàng sẽ hiện mọi biển hiệu bằng ngôn ngữ của bạn.',
    ] },
    { icon: '🏠', title: 'Nhà của bạn', lines: [
      'Căn hộ của bạn ở Forest Lane Apartments, cạnh lối ra số 2 ga Seoul Forest.',
      '🛋️ Trang trí: đặt, xoay và di chuyển đồ nội thất. Nội thất, đèn, giấy dán tường và bể cá mua ở các cửa hàng trong phố.',
      '🏗️ Mở rộng nhà: khi đủ tiền, mở rộng nhà từng bước.',
      'Ai được ghé thăm: Mọi người, Bạn bè (mặc định) hoặc Không ai. Tối đa 4 người cùng lúc.',
    ] },
    { icon: '🎣', title: 'Câu cá', lines: [
      'Đến công viên sông Hàn và chạm Đi câu cá. Quăng cần, chờ, rồi chạm Giật câu! ngay khi cá cắn.',
      'Sau đó chạm lần lượt hai nút Kéo (phím ← →) cho đến khi kéo được cá lên.',
      'Câu cá tự động chậm và không bao giờ câu được cá hiếm (★3 trở lên): hãy tự tay câu.',
      'Cá mới được ghi vào 📖 Sổ cá. Mồi ở quầy của ông cụ trong công viên giúp một chút.',
    ] },
    { icon: '👥', title: 'Bạn bè và trò chuyện', lines: [
      '💬 Trò chuyện (T hoặc Enter): nói với mọi người gần đó, tất cả bạn bè hoặc một người bạn.',
      'Chạm vào tên trong khung trò chuyện để kết bạn, hoặc thêm bằng tên qua 👥 trên thanh trò chuyện.',
      'Với bạn bè, bạn có thể đi chung taxi, đi xe cùng nhau, ghé nhà và tặng quà. Làm cùng nhau còn được thưởng.',
    ] },
    { icon: '📔', title: 'Sổ tay', lines: [
      'Sổ tay có tem địa điểm, sổ công thức, sổ món ăn, sổ cá và sổ chi tiêu.',
      'Đến các địa điểm để nhận tem. Sưu tập đủ sẽ có khung vàng trên bản đồ.',
      '📒 Sổ chi tiêu cho biết tiền đến từ đâu và đã đi đâu.',
    ] },
    { icon: '🎆', title: 'Ngày, đêm và biểu diễn', lines: [
      'Một ngày ở Seoul dài 3 tiếng nên đêm đến thường xuyên. Biểu diễn được cố ý làm hiếm.',
      '20:10 giờ Hàn Quốc, mỗi ngày: diễu hành đèn lồng từ Cheonggyecheon đến chùa Jogyesa.',
      '23:10 giờ Hàn Quốc: pháo hoa ở Yeouido hoặc trình diễn drone ở Ttukseom, luân phiên mỗi ngày.',
      'Thông báo ở phía trên màn hình sẽ báo trước khi biểu diễn bắt đầu.',
    ] },
    { icon: '💾', title: 'Lưu tiến trình', lines: [
      'Chơi bằng tài khoản khách, tiến trình có thể mất khi xóa dữ liệu trình duyệt hoặc đổi thiết bị.',
      '⚙️ Cài đặt → Liên kết tài khoản Google giữ an toàn tiền, vật phẩm và nhà, chơi tiếp trên mọi thiết bị.',
    ] },
  ],
};
