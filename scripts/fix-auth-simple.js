const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
dotenv.config();

async function fix() {
  const email = "vibhushree@virtueschool.com";
  const schoolId = "VIVA"; // Found from my previous knowledge/registry
  const role = "STAFF";

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.log("SERVICE_ROLE_KEY missing");
    return;
  }

  const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log(`Provisioning auth for ${email}...`);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: `Virtue@${schoolId}`,
      email_confirm: true,
      user_metadata: { school_id: schoolId, role }
  });

  if (error) {
    console.log("Error:", error.message);
  } else {
    console.log("Success! Password is: Virtue@" + schoolId);
  }
}

fix();
