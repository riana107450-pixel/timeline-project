
import { supabase } from "./supabase.js";

// 登入相關元素
const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");

// 活動管理相關元素
const activityForm = document.getElementById("activityForm");
const activityType = document.getElementById("activityType");
const relativeField = document.getElementById("relativeField");
const fixedField = document.getElementById("fixedField");
const relativeDay = document.getElementById("relativeDay");
const fixedDate = document.getElementById("fixedDate");
const activityTitle = document.getElementById("activityTitle");
const activityDescription = document.getElementById("activityDescription");
const activityList = document.getElementById("activityList");
const activityMessage = document.getElementById("activityMessage");
const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveButton");
const cancelEditButton = document.getElementById("cancelEditButton");

let editingId = null;

// 切換活動類型
function updateActivityType() {
    const isRelative = activityType.value === "relative";

    relativeField.hidden = !isRelative;
    fixedField.hidden = isRelative;

    relativeDay.required = isRelative;
    fixedDate.required = !isRelative;
}

activityType.addEventListener("change", updateActivityType);

// 重設活動表單
function resetActivityForm() {
    activityForm.reset();

    editingId = null;

    formTitle.textContent = "新增活動";
    saveButton.textContent = "新增活動";
    cancelEditButton.hidden = true;

    updateActivityType();
}

cancelEditButton.addEventListener("click", resetActivityForm);

// 檢查管理者身分
async function checkAdmin() {
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        loginSection.hidden = false;
        adminSection.hidden = true;
        return;
    }

    const { data, error } = await supabase.rpc(
        "is_timeline_admin"
    );

    if (error || data !== true) {
        await supabase.auth.signOut();

        loginSection.hidden = false;
        adminSection.hidden = true;

        loginMessage.textContent =
            "此帳號沒有管理者權限，或無法驗證身分。";

        return;
    }

    loginSection.hidden = true;
    adminSection.hidden = false;

    await loadActivities();
}

// 管理者登入
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    loginMessage.textContent = "登入中……";

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        loginMessage.textContent =
            "登入失敗：" + error.message;
        return;
    }

    await checkAdmin();
});

// 管理者登出
logoutButton.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        alert("登出失敗：" + error.message);
        return;
    }

    loginSection.hidden = false;
    adminSection.hidden = true;

    loginMessage.textContent = "已登出。";
});

// 取得並顯示所有活動
async function loadActivities() {
    activityList.textContent = "正在載入活動……";

    const { data, error } = await supabase
        .from("activities")
        .select("*");

    if (error) {
        activityList.textContent =
            "讀取活動失敗：" + error.message;
        return;
    }

    if (!data || data.length === 0) {
        activityList.textContent = "目前沒有任何活動。";
        return;
    }

    // 相對日期排在前面，固定日期依日期排序
    data.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === "relative" ? -1 : 1;
        }

        if (a.type === "relative") {
            return a.day - b.day;
        }

        return a.event_date.localeCompare(b.event_date);
    });

    activityList.replaceChildren();

    data.forEach((activity) => {
        const card = document.createElement("div");
        card.className = "activity-card";

        const title = document.createElement("h4");
        title.textContent = activity.title;

        const date = document.createElement("p");

        if (activity.type === "relative") {
            date.textContent = `相對日期：第 ${activity.day} 天`;
        } else {
            date.textContent = `固定日期：${activity.event_date}`;
        }

        const description = document.createElement("p");
        description.textContent =
            activity.description || "沒有活動說明";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "編輯";

        editButton.addEventListener("click", () => {
            editActivity(activity);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "刪除";

        deleteButton.addEventListener("click", () => {
            deleteActivity(activity.id);
        });

        card.append(
            title,
            date,
            description,
            editButton,
            deleteButton
        );

        activityList.appendChild(card);
    });
}

// 新增或更新活動
activityForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const type = activityType.value;

    const payload = {
        type,
        day: type === "relative"
            ? Number(relativeDay.value)
            : null,
        event_date: type === "fixed"
            ? fixedDate.value
            : null,
        title: activityTitle.value.trim(),
        description: activityDescription.value.trim()
    };

    if (!payload.title) {
        activityMessage.textContent = "請輸入活動名稱。";
        return;
    }

    saveButton.disabled = true;
    activityMessage.textContent = "儲存中……";

    let error;

    if (editingId) {
        const result = await supabase
            .from("activities")
            .update({
                ...payload,
                updated_at: new Date().toISOString()
            })
            .eq("id", editingId);

        error = result.error;

    } else {
        const result = await supabase
            .from("activities")
            .insert(payload);

        error = result.error;
    }

    saveButton.disabled = false;

    if (error) {
        activityMessage.textContent =
            "儲存失敗：" + error.message;
        return;
    }

    activityMessage.textContent =
        editingId ? "活動更新成功！" : "活動新增成功！";

    resetActivityForm();

    await loadActivities();
});

// 編輯活動
function editActivity(activity) {
    editingId = activity.id;

    activityType.value = activity.type;
    relativeDay.value = activity.day ?? "";
    fixedDate.value = activity.event_date ?? "";
    activityTitle.value = activity.title;
    activityDescription.value = activity.description ?? "";

    updateActivityType();

    formTitle.textContent = "編輯活動";
    saveButton.textContent = "儲存修改";
    cancelEditButton.hidden = false;

    activityMessage.textContent = "";

    activityForm.scrollIntoView({
        behavior: "smooth"
    });
}

// 刪除活動
async function deleteActivity(id) {
    const confirmed = confirm(
        "確定要刪除這筆活動嗎？此操作無法復原。"
    );

    if (!confirmed) {
        return;
    }

    const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", id);

    if (error) {
        activityMessage.textContent =
            "刪除失敗：" + error.message;
        return;
    }

    activityMessage.textContent = "活動刪除成功！";

    await loadActivities();
}

// 頁面載入時檢查登入狀態
updateActivityType();

checkAdmin().catch((error) => {
    console.error("初始化失敗：", error);
    loginMessage.textContent =
        "初始化失敗，請重新整理頁面。";
});
