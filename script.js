
import { supabase } from "./supabase.js";

const startDateInput = document.getElementById("startDate");
const timeline = document.getElementById("timeline");

// 公開頁面不允許管理活動
const eventForm = document.getElementById("eventForm");

if (eventForm) {
    eventForm.hidden = true;
}

// 取得今天的本地日期，避免 UTC 日期偏移
function getTodayLocalString() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// 載入訪客自己的起始日期
const savedStartDate = localStorage.getItem("timelineStartDate");

startDateInput.value = savedStartDate || getTodayLocalString();

// 日期處理
function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);

    return new Date(year, month - 1, day);
}

function formatDate(date) {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

// 計算活動日期
function getEventDate(activity, startDate) {
    if (activity.type === "relative") {
        const date = new Date(startDate);

        date.setDate(date.getDate() + activity.day - 1);

        return date;
    }

    return parseLocalDate(activity.date);
}

// 從 Supabase 載入活動
async function loadActivities() {
    timeline.textContent = "正在載入活動……";

    const { data, error } = await supabase
        .from("activities")
        .select("*");

    if (error) {
        console.error("活動資料讀取失敗：", error);

        timeline.textContent =
            "活動資料載入失敗，請稍後重新整理頁面。";

        return;
    }

    // 將資料庫欄位轉換成原本時間軸使用的格式
    activities = data.map(activity => ({
        id: activity.id,
        type: activity.type,
        day: activity.day,
        date: activity.event_date,
        title: activity.title,
        description: activity.description
    }));

    renderTimeline();
}

// 所有訪客共用同一份雲端活動資料
let activities = [];

// 顯示時間軸
function renderTimeline() {
    timeline.innerHTML = "";

    if (!startDateInput.value) {
        timeline.textContent = "請先選擇起始日期。";
        return;
    }

    if (activities.length === 0) {
        timeline.textContent = "目前沒有任何活動。";
        return;
    }

    const startDate = parseLocalDate(startDateInput.value);

    const sortedActivities = activities
        .map(activity => ({
            ...activity,
            eventDate: getEventDate(activity, startDate)
        }))
        .sort((a, b) => {
            return a.eventDate - b.eventDate ||
                String(a.id).localeCompare(String(b.id));
        });

    sortedActivities.forEach(activity => {
        const item = document.createElement("div");
        item.className = "timeline-item";

        const heading = document.createElement("h3");

        heading.textContent = formatDate(activity.eventDate);

        if (activity.type === "relative") {
            heading.textContent += `｜第 ${activity.day} 天`;
        } else {
            heading.textContent += "｜固定日期";
        }

        const typeLabel = document.createElement("span");

        typeLabel.className = `activity-type ${activity.type}`;

        typeLabel.textContent =
            activity.type === "relative"
                ? "相對日期"
                : "固定日期";

        const title = document.createElement("strong");
        title.textContent = activity.title;

        const description = document.createElement("p");
        description.textContent = activity.description || "";

        // 公開頁面只顯示活動，不提供編輯或刪除按鈕
        item.append(
            heading,
            typeLabel,
            title,
            description
        );

        timeline.appendChild(item);
    });
}

// 更改訪客自己的起始日期
startDateInput.addEventListener("change", () => {
    localStorage.setItem(
        "timelineStartDate",
        startDateInput.value
    );

    renderTimeline();
});

// 初次載入雲端活動
loadActivities();

// 訂閱 Supabase 即時更新
supabase
    .channel("activities-changes")
    .on(
        "postgres_changes",
        {
            event: "*",
            schema: "public",
            table: "activities"
        },
        (payload) => {
            console.log("活動資料已更新：", payload);

            // 重新讀取最新活動
            loadActivities();
        }
    )
    .subscribe((status) => {
        console.log("Realtime 狀態：", status);
    });