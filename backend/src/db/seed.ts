import { supabaseAdmin } from "../infrastructure/supabase/client";

const seed = async () => {
  try {
    // 既存データ削除
    await supabaseAdmin.from("reservations").delete().neq("id", 0);
    await supabaseAdmin.from("tables").delete().neq("id", 0);

    // 既存のprofilesとauth.usersを削除
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    for (const user of existingUsers.users) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }

    // スタッフ作成
    const { data: staffData, error: staffError } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@example.com",
      password: "password123",
      email_confirm: true,
      user_metadata: { role: "staff", name: "オーナー太郎" },
    });
    if (staffError) throw staffError;
    console.log("スタッフ作成:", staffData.user.id);

    // お客さん1
    const { data: customer1Data, error: customer1Error } = await supabaseAdmin.auth.admin.createUser({
      email: "tanaka@example.com",
      password: "password123",
      email_confirm: true,
      user_metadata: { role: "customer", name: "田中花子", phone: "09012345678" },
    });
    if (customer1Error) throw customer1Error;
    console.log("お客さん1作成:", customer1Data.user.id);

    // お客さん2
    const { data: customer2Data, error: customer2Error } = await supabaseAdmin.auth.admin.createUser({
      email: "suzuki@example.com",
      password: "password123",
      email_confirm: true,
      user_metadata: { role: "customer", name: "鈴木一郎", phone: "08098765432" },
    });
    if (customer2Error) throw customer2Error;
    console.log("お客さん2作成:", customer2Data.user.id);

    // テーブル作成
    const tablesData = [
      { table_name: "カウンター1", capacity: 2 },
      { table_name: "カウンター2", capacity: 2 },
      { table_name: "テーブルA", capacity: 4 },
      { table_name: "テーブルB", capacity: 4 },
      { table_name: "テーブルC", capacity: 4 },
      { table_name: "座敷", capacity: 8 },
      { table_name: "個室", capacity: 6 },
    ];

    const { data: tables, error: tablesError } = await supabaseAdmin
      .from("tables")
      .insert(tablesData)
      .select();

    if (tablesError) throw tablesError;
    console.log("テーブル作成:", tables.length, "件");

    // サンプル予約
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const reservationsData = [
      {
        table_id: tables[2].id, // テーブルA
        customer_id: customer1Data.user.id,
        customer_name: "田中花子",
        customer_phone: "09012345678",
        date: dateStr,
        start_time: "18:00",
        end_time: "19:30",
        party_size: 3,
        status: "confirmed",
        note: "アレルギー：えび",
        created_by: "customer",
      },
      {
        table_id: tables[5].id, // 座敷
        customer_id: null,
        customer_name: "山田太郎",
        customer_phone: "07011112222",
        date: dateStr,
        start_time: "19:00",
        end_time: "21:00",
        party_size: 6,
        status: "confirmed",
        note: "誕生日ケーキ持ち込み",
        created_by: "staff",
      },
    ];

    const { error: resError } = await supabaseAdmin
      .from("reservations")
      .insert(reservationsData);

    if (resError) throw resError;

    console.log("\nシード完了！");
    console.log("---");
    console.log("スタッフ: admin@example.com / password123");
    console.log("お客さん1: tanaka@example.com / password123");
    console.log("お客さん2: suzuki@example.com / password123");
  } catch (error) {
    console.error("シードエラー:", error);
    process.exit(1);
  }

  process.exit(0);
};

seed();
