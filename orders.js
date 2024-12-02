var Orders = [];
var database = firebase.database();

function GetData() {
    const dbRef = firebase.database().ref();
    const listOfDataRef = dbRef.child('ListOfdata');
    const danhSachRef = dbRef.child('Danhsach');
    
    // Kiểm tra xem dữ liệu đã bị xóa lần cuối chưa
    const dataCleared = localStorage.getItem('dataCleared');
    const lastClearedDataId = localStorage.getItem('lastClearedDataId') || null;

    // Lắng nghe sự thay đổi trong ListOfdata
    listOfDataRef.on('value', snapshot => {
        console.log("Data from ListOfdata:", snapshot.val());

        // Làm trống Orders trước khi thêm dữ liệu mới
        Orders = [];
        let hasNewData = false;

        // Duyệt qua các bản ghi trong ListOfdata
        snapshot.forEach(childSnapshot => {
            const order = childSnapshot.val();

            // Nếu ID của order khác với lastClearedDataId, coi là dữ liệu mới
            if (order.id !== lastClearedDataId) {
                hasNewData = true;

                // Lấy studentIDs từ danhSach một lần duy nhất
                danhSachRef.once('value', studentSnapshot => {
                    const studentData = studentSnapshot.val();

                    // Kiểm tra và lấy studentIDs từ danhSach
                    if (studentData && studentData[order.id]) {
                        order.studentIDs = studentData[order.id].studentIDs;
                    } else {
                        order.studentIDs = "N/A";  // Nếu không tìm thấy, gán "N/A"
                    }

                    // Thêm order vào Orders
                    Orders.push(order);

                    // Cập nhật bảng khi đã có đủ dữ liệu
                    UpdateTable();
                });
            }
        });

        // Nếu không có dữ liệu mới, ngăn cập nhật bảng
        if (!hasNewData && dataCleared === "true") {
            console.log("No new data available after clearing.");
            return;
        }
    });
}

function UpdateTable() {
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = '';  // Làm trống bảng trước khi cập nhật

    // Thêm dữ liệu vào bảng
    Orders.forEach(order => {
        const tr = document.createElement('tr');
        const trContent = `
            <td>${order.id}</td>
            <td>${order.studentIDs}</td>
            <td>${order.time}</td>
        `;
        tr.innerHTML = trContent;

        // Thêm dòng vào bảng
        tbody.insertBefore(tr, tbody.firstChild);
    });
}


// Hàm xóa dữ liệu trong bảng
function clearData() {
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ""; // Xóa tất cả các hàng trong tbody
    Orders = []; // Xóa mảng dữ liệu Orders

    const listOfDataRef = firebase.database().ref('ListOfdata');
    
    // Lặp qua từng bản ghi trong ListOfdata và xóa chỉ id và time
    listOfDataRef.once('value', snapshot => {
        snapshot.forEach(childSnapshot => {
            const childKey = childSnapshot.key;
            const studentIDs = childSnapshot.val().studentIDs;

            // Cập nhật node con, chỉ giữ lại studentIDs
            listOfDataRef.child(childKey).set({
                studentIDs: studentIDs // Giữ lại trường studentIDs
            });
        });
    }).then(() => {
        console.log("Cleared id and time from Firebase, kept studentIDs.");
    }).catch(error => {
        console.error("Error clearing data in Firebase:", error);
    });

    // Đặt cờ để ngăn hiển thị dữ liệu trên web
    localStorage.setItem('dataCleared', 'true');
}


// Hàm xuất dữ liệu ra file Excel
function exportTableToExcel() {
    const table = document.getElementById("dataTable");
    
    // Kiểm tra nếu bảng không có dữ liệu
    if (!table || !table.getElementsByTagName("tbody")[0].hasChildNodes()) {
        alert("Không có dữ liệu để xuất ra Excel.");
        return;
    }
    
    // Tạo workbook từ bảng
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
    const worksheet = workbook.Sheets["Sheet1"];

    // Duyệt qua từng ô trong cột thời gian và đặt định dạng thành chuỗi
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let row = range.s.r + 1; row <= range.e.r; row++) { // bắt đầu từ hàng thứ hai (bỏ qua tiêu đề)
        const cellAddress = `C${row + 1}`; // Cột C là cột chứa thời gian
        const cell = worksheet[cellAddress];
        if (cell && typeof cell.v === "string" && cell.v.includes("T")) { // Kiểm tra định dạng thời gian
            cell.t = "s"; // Đặt kiểu dữ liệu thành chuỗi (string)
        }
    }

    // Xuất file Excel
    XLSX.writeFile(workbook, "DanhSachDiemDanh.xlsx");
}

// Lắng nghe sự kiện tải trang
window.addEventListener('load', GetData);
