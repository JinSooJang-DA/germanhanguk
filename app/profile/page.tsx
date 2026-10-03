"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";
import { COMMUNITY_REPUTATION_ENABLED, getCommunityLevelProgress } from "@/lib/communityReputation";
import BilingualButtonText from "@/components/BilingualButtonText";
import { persistUiLanguage } from "@/lib/auth-locale";

interface Post {
  id: number;
  title: string;
  category: string;
  region: string;
  created_at: string;
}

interface ReputationEvent {
  id: number;
  event_type: string;
  xp_delta: number;
  created_at: string;
}

const REPUTATION_EVENT_LABELS: Record<string, string> = {
  POST_CREATED: "\uAC8C\uC2DC\uAE00 \uC791\uC131",
  COMMENT_CREATED: "\uB313\uAE00 \uC791\uC131",
  POST_LIKE_RECEIVED: "\uB0B4 \uAE00 \uCD94\uCC9C\uBC1B\uC74C",
  GUIDE_FIRST_READ: "\uC0DD\uD65C\uAC00\uC774\uB4DC \uC77D\uAE30",
};

const GERMAN_REGIONS = [
  "Berlin (베를린)",
  "Frankfurt am Main (프랑크푸르트)",
  "München (뮌헨)",
  "Düsseldorf (뒤셀도르프)",
  "Hamburg (함부르크)",
  "Köln (쾰른)",
  "Stuttgart (슈투트가르트)",
  "Münster (뮌스터)",
  "Nürnberg (뉘른베르크)",
  "Leipzig (라이프치히)",
  "Dresden (드레스덴)",
  "Bonn (본)",
  "기타 독일 지역",
];

const CATEGORIES: Record<string, [string, string]> = {
  community: ["커뮤니티", "Community"],
  education: ["유학·교육", "Studium · Bildung"],
  life: ["생활정보", "Leben in Deutschland"],
  market: ["중고장터", "Marktplatz"],
  jobs: ["구인구직", "Jobs"],
  tandem: ["탄뎀", "Tandem"],
  "culture-events": ["문화·행사", "Kultur · Events"],
  events: ["행사", "Events"],
};

// 이미지를 최대 256px 규격으로 리사이즈 및 WebP 압축하는 함수
function compressImage(
  file: File,
  maxWidth = 256,
  maxHeight = 256,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let width = img.width;
      let height = img.height;

      // 가로/세로 비율 유지 리사이징
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context를 불러올 수 없습니다."));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("이미지 압축에 실패했습니다."));
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = (err) => reject(err);
  });
}

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");
  const [uiLanguage, setUiLanguage] = useState<"ko" | "de">("ko");
  const [nationality, setNationality] = useState("");
  const [showNationality, setShowNationality] = useState(false);
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [learningLanguage, setLearningLanguage] = useState("");
  const [tandemEnabled, setTandemEnabled] = useState(false);
  const [germanySince, setGermanySince] = useState("");
  const [showCommunityLevel, setShowCommunityLevel] = useState(true);
  const [showGermanyTenure, setShowGermanyTenure] = useState(false);
  const [showReputationStats, setShowReputationStats] = useState(false);
  const [reputationXp, setReputationXp] = useState(0);
  const [reputationScores, setReputationScores] = useState({ activity: 0, knowledge: 0, communication: 0, helpful: 0 });
  const [recentReputationEvents, setRecentReputationEvents] = useState<ReputationEvent[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Independent post loading and error states
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [profileRetryKey, setProfileRetryKey] = useState(0);

  async function fetchMyPosts(userId: string) {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("id, title, category, region, created_at")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("My posts fetch error:", postsError);
        setPostsError("작성한 글을 불러오지 못했습니다.");
        setMyPosts([]);
        return;
      }

      setMyPosts(posts || []);
    } catch (err) {
      console.error("Unexpected my posts fetch error:", err);
      setPostsError("작성한 글을 불러오지 못했습니다.");
      setMyPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }

  async function handleRetryPosts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      fetchMyPosts(user.id);
    }
  }

  function handleRetryProfile() {
    setProfileRetryKey((prev) => prev + 1);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadUserData() {
      setLoading(true);
      setLoadError("");
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (isCurrent) {
            alert("로그인이 필요합니다.");
            router.push("/auth");
          }
          return;
        }

        if (isCurrent) {
          setEmail(user.email || "");
        }

        // 1. profiles 테이블에서 정보 가져오기
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, region, bio, role, ui_language, tandem_enabled, show_nationality")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Profile DB load error:", profileError);
          if (isCurrent) {
            setLoadError("프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
            setLoading(false);
          }
          return;
        }

        if (isCurrent) {
          if (profile) {
            setDisplayName(profile.display_name || user.email?.split("@")[0] || "");
            setAvatarUrl(profile.avatar_url || "");
            setRegion(profile.region || "");
            setBio(profile.bio || "");
            setIsAdmin(profile.role === "admin");
            setUiLanguage(profile.ui_language === "de" ? "de" : "ko");
            setTandemEnabled(profile.tandem_enabled === true);
            setShowNationality(profile.show_nationality === true);
            const { data: languageDetails } = await supabase.from("profile_private_details").select("nationality, native_language, learning_language").eq("user_id", user.id).maybeSingle();
            setNationality(languageDetails?.nationality || "");
            setNativeLanguage(languageDetails?.native_language || "");
            setLearningLanguage(languageDetails?.learning_language || "");
            if (COMMUNITY_REPUTATION_ENABLED) {
              const [{ data: settings }, { data: privateDetails }, { data: reputation }, { data: recentEvents }] = await Promise.all([
                supabase.from("profiles").select("show_community_level, show_germany_tenure, show_reputation_stats").eq("id", user.id).single(),
                supabase.from("profile_private_details").select("germany_since, nationality, native_language, learning_language").eq("user_id", user.id).maybeSingle(),
                supabase.from("community_reputation").select("reputation_xp, activity_score, knowledge_score, communication_score, helpful_score").eq("user_id", user.id).maybeSingle(),
                supabase.from("reputation_events").select("id, event_type, xp_delta, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
              ]);
              setGermanySince(privateDetails?.germany_since || "");
              setNationality(privateDetails?.nationality || "");
              setNativeLanguage(privateDetails?.native_language || "");
              setLearningLanguage(privateDetails?.learning_language || "");
              setReputationXp(reputation?.reputation_xp || 0);
              setReputationScores({
                activity: reputation?.activity_score || 0,
                knowledge: reputation?.knowledge_score || 0,
                communication: reputation?.communication_score || 0,
                helpful: reputation?.helpful_score || 0,
              });
              setRecentReputationEvents((recentEvents as ReputationEvent[] | null) || []);
              if (settings) {
                setShowCommunityLevel(settings.show_community_level !== false);
                setShowGermanyTenure(settings.show_germany_tenure === true);
                setShowReputationStats(settings.show_reputation_stats === true);
              }
            }
          } else {
            setDisplayName(user.email?.split("@")[0] || "");
          }
          setLoading(false);
        }

        // 2. 내가 쓴 글 독립적으로 가져오기
        if (isCurrent) {
          fetchMyPosts(user.id);
        }

      } catch (err) {
        console.error("Profile load error:", err);
        if (isCurrent) {
          setLoadError("프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
          setLoading(false);
        }
      }
    }

    loadUserData();

    return () => {
      isCurrent = false;
    };
  }, [profileRetryKey, router]);

  // 프로필 정보(닉네임, 거주지역, 자기소개) 저장
  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
        return;
      }

      const profileUpdates: Record<string, string | boolean | null> = {
        display_name: displayName.trim(),
        region: region.trim(),
        bio: bio.trim(),
        ui_language: uiLanguage,
        tandem_enabled: tandemEnabled,
        show_nationality: showNationality && Boolean(nationality) && nationality !== "PRIVATE",
        updated_at: new Date().toISOString(),
      };
      if (COMMUNITY_REPUTATION_ENABLED) {
        profileUpdates.show_community_level = showCommunityLevel;
        profileUpdates.show_germany_tenure = showGermanyTenure;
        profileUpdates.show_reputation_stats = showReputationStats;
      }

      const { error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user.id);

      if (error) {
        setMessage("프로필 수정 실패: " + error.message);
        return;
      }

      setMessage("프로필이 성공적으로 변경되었습니다.");
      window.localStorage.setItem("gh-ui-language", uiLanguage);
      window.dispatchEvent(new CustomEvent("gh-language-changed", { detail: uiLanguage }));
      const privateDetailsUpdate: Record<string, string | null> = {
        user_id: user.id,
        nationality: nationality || null,
        native_language: nativeLanguage || null,
        learning_language: learningLanguage || null,
        updated_at: new Date().toISOString(),
      };
      if (COMMUNITY_REPUTATION_ENABLED) privateDetailsUpdate.germany_since = germanySince || null;
      const { error: privateError } = await supabase.from("profile_private_details").upsert(privateDetailsUpdate);
      if (privateError) {
        console.error("Private profile details save error:", privateError);
        setMessage(t("언어·프로필 상세 정보 저장에 실패했습니다. 다시 시도해주세요.", "Sprach- und Profildetails konnten nicht gespeichert werden. Bitte versuche es erneut."));
        return;
      }

      router.refresh();
    } catch (err) {
      console.error("Profile save error:", err);
      setMessage("프로필 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

 // 아바타 이미지 업로드 핸들러 (자동 리사이즈 & 압축 적용)
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];

      // 1. 기본 확장자 체크
      const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (!fileExt || !allowedExtensions.includes(fileExt)) {
        alert("jpg, jpeg, png, webp, gif 형식의 이미지만 등록 가능합니다.");
        e.target.value = "";
        return;
      }

      // 2. 극단적인 고용량(예: 15MB 초과) 원본 차단
      if (file.size > 15 * 1024 * 1024) {
        alert("15MB 이하의 원본 이미지를 선택해 주세요.");
        e.target.value = "";
        return;
      }

      setUploading(true);

      // 3. 브라우저에서 256x256, 30~50KB 수준으로 즉시 압축 변환
      const compressedBlob = await compressImage(file, 256, 256, 0.8);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인 세션이 유효하지 않습니다.");
        return;
      }

      // 항상 webp 확장자로 통일하여 저장
      const fileName = `${user.id}-${Date.now()}.webp`;
      const filePath = `${fileName}`;

      // 4. Supabase Storage 버킷에 압축본 업로드 (용량이 작아 수십 밀리초 만에 완료됨)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressedBlob, {
          contentType: "image/webp",
          cacheControl: "31536000", // 1년 캐싱
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const currentName = displayName.trim() || user.email?.split("@")[0] || "회원";

      // 5. DB profiles 테이블 반영 (기존 region, bio 보존)
      const { error: dbError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            display_name: currentName,
            avatar_url: publicUrl,
            region: region.trim() || null,
            bio: bio.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (dbError) throw dbError;

      setAvatarUrl(publicUrl);
      alert("프로필 이미지가 가볍고 선명하게 최적화되어 등록되었습니다!");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";
      alert("이미지 저장 중 오류가 발생했습니다: " + errorMessage);
    } finally {
      setUploading(false);
    }
  }

  // 비밀번호 변경 핸들러
  async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMessage("");

    if (newPassword.length < 6) {
      setPasswordMessage("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMessage("비밀번호 변경 실패: " + error.message);
      return;
    }

    setPasswordMessage("비밀번호가 성공적으로 변경되었습니다.");
    setNewPassword("");
  }

  // 로그아웃
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="new-post-page">
        <div className="post-form-container" style={{ textAlign: "center", padding: "40px" }}>
          <p>프로필 정보를 불러오는 중입니다...</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="new-post-page">
        <div className="post-form-container" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ marginBottom: "20px", color: "var(--gh-text-muted)" }}>{loadError}</p>
          <button
            type="button"
            onClick={handleRetryProfile}
            style={{
              padding: "10px 20px",
              background: "var(--gh-control-active)",
              color: "var(--gh-control-active-text)",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  const levelProgress = getCommunityLevelProgress(reputationXp);
  const de = uiLanguage === "de";
  const t = (ko: string, german: string) => de ? german : ko;
  const regionLabel = (city: string) => de ? (city === "기타 독일 지역" ? "Andere Region in Deutschland" : city.split(" (")[0]) : city;

  return (
    <main className="new-post-page">
      <div className="post-form-container" style={{ maxWidth: "800px" }}>
        <h1>{t("마이페이지 (프로필 관리)", "Mein Bereich (Profil verwalten)")}</h1>

        {/* 1. 프로필 이미지 및 기본 정보 섹션 */}
        <div style={{ display: "flex", gap: "30px", alignItems: "center", marginBottom: "30px", background: "var(--gh-surface-muted)", padding: "20px", borderRadius: "10px" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "var(--gh-surface)",
                overflow: "hidden",
                margin: "0 auto 10px auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "#fff", fontSize: "28px" }}>👤</span>
              )}
            </div>
            <label style={{ fontSize: "12px", background: "var(--gh-accent)", color: "var(--gh-text-white)", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}>
              {uploading ? t("업로드 중...", "Wird hochgeladen...") : <BilingualButtonText ko="사진 변경" de="Foto ändern" />}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} disabled={uploading} />
            </label>
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 5px 0", fontSize: "14px", color: "var(--gh-text-muted)" }}>
              {t("로그인 계정", "Anmeldekonto")} <span style={{ fontSize: "12px", color: "var(--gh-text-subtle)" }}>({t("이메일 변경 불가", "E-Mail nicht änderbar")})</span>
            </p>
            <p style={{ margin: "0 0 15px 0", fontSize: "16px", fontWeight: "bold" }}>{email}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--gh-text-muted)" }}>
                {isAdmin
                  ? t("German Hanguk의 기사와 커뮤니티를 관리하는 관리자 계정입니다.", "Administratorkonto für Artikel und Community von German Hanguk.")
                  : t("German Hanguk 커뮤니티에서 활동 중인 회원입니다.", "Du bist Mitglied der German-Hanguk-Community.")}
              </p>
              {isAdmin && (
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#fff", background: "#4f9fa2", padding: "3px 8px", borderRadius: "999px" }}>
                  ADMIN
                </span>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <section aria-label="관리자 바로가기" style={{ marginBottom: "30px", padding: "22px", border: "1px solid #9bc8c7", borderRadius: "10px", background: "color-mix(in srgb, #4f9fa2 8%, var(--gh-surface))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: "0 0 5px", fontSize: "12px", fontWeight: 800, color: "#4f9fa2", letterSpacing: "0.04em" }}>ADMIN WORKSPACE</p>
                <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>운영센터</h2>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--gh-text-muted)" }}>회원·커뮤니티·기사·문의 현황을 한곳에서 관리할 수 있습니다.</p>
              </div>
              <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "11px 16px", borderRadius: "7px", background: "var(--gh-accent)", color: "var(--gh-text-white)", textDecoration: "none", fontWeight: 800 }}>
                운영센터 / Admin →
              </Link>
            </div>
          </section>
        )}

        {/* 2. 기본 정보 (닉네임, 거주지역, 자기소개) 수정 폼 */}
        <form className="post-form" onSubmit={handleProfileSubmit} style={{ marginBottom: "40px" }}>
          <h2>{t("기본 정보 수정", "Grundinformationen bearbeiten")}</h2>
          <div className="form-group">
            <label htmlFor="displayName">{t("닉네임 (별명)", "Anzeigename")}</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("커뮤니티에서 사용할 닉네임을 입력하세요", "Anzeigenamen für die Community eingeben")}
              required
              minLength={2}
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label htmlFor="region">{t("거주지역", "Wohnort")}</label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid var(--gh-border)",
                borderRadius: "4px",
                fontSize: "15px",
                background: "var(--gh-surface)",
                color: "var(--gh-text)",
              }}
            >
              <option value="">{t("거주지역을 선택하세요", "Wohnort auswählen")}</option>
              {GERMAN_REGIONS.map((city) => (
                <option key={city} value={city}>
                  {regionLabel(city)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="bio">{t("자기소개", "Über mich")}</label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("간단한 자기소개를 작성해 보세요", "Erzähl der Community kurz etwas über dich")}
              maxLength={200}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid var(--gh-border)",
                borderRadius: "4px",
                fontSize: "16px",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          <section className="profile-tandem-settings">
            <div className="profile-tandem-settings__head"><span>GERMANY ↔ KOREA</span><h3>{t("언어 · Tandem 프로필", "Sprache · Tandem-Profil")}</h3><p>{t("화면 언어와 다른 사람에게 보여줄 언어 정보를 직접 선택할 수 있어요.", "Wähle deine Anzeigesprache und welche Sprachinformationen andere sehen dürfen.")}</p></div>
            <div className="profile-language-first"><button type="button" className={uiLanguage === "ko" ? "is-active" : ""} onClick={() => { setUiLanguage("ko"); persistUiLanguage("ko"); }}>🇰🇷 한국어</button><button type="button" className={uiLanguage === "de" ? "is-active" : ""} onClick={() => { setUiLanguage("de"); persistUiLanguage("de"); }}>🇩🇪 Deutsch</button></div>
            <div className="profile-language-pair"><label>국적 / Nationalität<select value={nationality} onChange={(e) => setNationality(e.target.value)}><option value="">선택 안 함 / Keine Angabe</option><option value="KR">대한민국 / Südkorea</option><option value="DE">독일 / Deutschland</option><option value="OTHER">기타 / Andere</option><option value="PRIVATE">표시하지 않음 / Privat</option></select></label><label>주로 사용하는 언어 / Meine Sprache<select value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)}><option value="">선택 안 함 / Keine Angabe</option><option>한국어 / Koreanisch</option><option>Deutsch</option><option>English</option><option>기타 / Andere</option></select></label></div>
            <label>배우고 싶은 언어 / Ich lerne<select value={learningLanguage} onChange={(e) => setLearningLanguage(e.target.value)}><option value="">선택 안 함 / Keine Auswahl</option><option>한국어 / Koreanisch</option><option>Deutsch</option><option>English</option><option>기타 / Andere</option></select></label>
            {nationality && nationality !== "PRIVATE" && <label className="auth-check-row"><input type="checkbox" checked={showNationality} onChange={(e) => setShowNationality(e.target.checked)} /><span>국적을 공개합니다 / Nationalität anzeigen</span></label>}
            <label className="tandem-optin-row"><input type="checkbox" checked={tandemEnabled} onChange={(e) => setTandemEnabled(e.target.checked)} /><span><strong>🇰🇷 ↔ 🇩🇪 탄뎀 찾는 중 / Tandem gesucht</strong><small>{t("켜면 언어 정보가 공개 프로필에 표시됩니다.", "Wenn aktiviert, werden deine Sprachangaben im öffentlichen Profil angezeigt.")}</small></span></label>
          </section>

          {COMMUNITY_REPUTATION_ENABLED && (
            <section className="profile-growth-card" aria-label="community growth">
              <div className="profile-growth-card__top">
                <div>
                  <span className="profile-growth-card__eyebrow">{t("나의 커뮤니티 성장", "Meine Community-Entwicklung")}</span>
                  <strong>{levelProgress.current.icon} {levelProgress.current.label}</strong>
                </div>
                <span className="profile-growth-card__xp">{reputationXp} XP</span>
              </div>
              {levelProgress.next ? (
                <>
                  <div className="profile-growth-card__progress" aria-label={`${levelProgress.next.label} ${levelProgress.percent}%`}>
                    <span style={{ width: `${levelProgress.percent}%` }} />
                  </div>
                  <p>{levelProgress.next.icon} {levelProgress.next.label} · <b>{levelProgress.remainingXp} XP</b> {t("남았어요.", "bis zum nächsten Level")}</p>
                </>
              ) : (
                <p>{t("최고 등급에 도달했어요. 지금처럼 커뮤니티를 도와주세요!", "Du hast das höchste Level erreicht. Danke für deinen Beitrag zur Community!")}</p>
              )}
              <div className="profile-growth-card__scores">
                <span>{t("활동", "Aktivität")} <b>{reputationScores.activity}</b></span>
                <span>{t("지식", "Wissen")} <b>{reputationScores.knowledge}</b></span>
                <span>{t("소통", "Kommunikation")} <b>{reputationScores.communication}</b></span>
                <span>{t("도움", "Hilfreich")} <b>{reputationScores.helpful}</b></span>
              </div>
              <small>{t("이 상세 점수는 본인에게만 항상 보이며, 다른 사람에게는 공개 설정을 따릅니다.", "Diese Detailwerte sind für dich immer sichtbar; für andere gelten deine Sichtbarkeitseinstellungen.")}</small>
              {!de && recentReputationEvents.length > 0 && (
                <div className="profile-growth-card__recent">
                  <strong>{"\uCD5C\uADFC \uC131\uC7A5 \uAE30\uB85D"}</strong>
                  <ul>
                    {recentReputationEvents.map((event) => (
                      <li key={event.id}>
                        <span>{REPUTATION_EVENT_LABELS[event.event_type] || event.event_type}</span>
                        <span><b>+{event.xp_delta} XP</b> Â· {formatDate(event.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {COMMUNITY_REPUTATION_ENABLED && (
            <div className="profile-reputation-settings">
              <div className="form-group">
                <label htmlFor="germanySince">{t("독일 거주 시작일", "In Deutschland seit")}</label>
                <input id="germanySince" type="date" value={germanySince} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setGermanySince(e.target.value)} />
                <small>{t("실제 날짜는 공개하지 않고, 선택하면 독일생활 기간만 표시합니다.", "Das genaue Datum bleibt privat; angezeigt wird nur die Aufenthaltsdauer.")}</small>
              </div>
              <fieldset>
                <legend>{t("공개 설정", "Sichtbarkeit")}</legend>
                <label><input type="checkbox" checked={showCommunityLevel} onChange={(e) => setShowCommunityLevel(e.target.checked)} /> {t("등급 표시", "Level anzeigen")}</label>
                <label><input type="checkbox" checked={showGermanyTenure} onChange={(e) => setShowGermanyTenure(e.target.checked)} /> {t("독일생활 기간 표시", "Aufenthaltsdauer anzeigen")}</label>
                <label><input type="checkbox" checked={showReputationStats} onChange={(e) => setShowReputationStats(e.target.checked)} /> {t("활동 수치 공개", "Aktivitätswerte anzeigen")}</label>
              </fieldset>
            </div>
          )}

          {message && (
            <p className="form-message" style={{ color: message.includes("성공") ? "var(--gh-success)" : "var(--gh-alert)" }}>
              {message}
            </p>
          )}

          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? t("저장 중...", "Wird gespeichert...") : <BilingualButtonText ko="프로필 정보 저장" de="Profil speichern" />}
          </button>
        </form>

        {/* 3. 비밀번호 변경 폼 */}
        <form className="post-form" onSubmit={handlePasswordChange} style={{ marginBottom: "40px", borderTop: "1px solid var(--gh-border)", paddingTop: "30px" }}>
          <h2>{t("비밀번호 변경", "Passwort ändern")}</h2>
          <div className="form-group">
            <label htmlFor="newPassword">{t("새 비밀번호 (6자 이상)", "Neues Passwort (mind. 6 Zeichen)")}</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("새로운 비밀번호를 입력하세요", "Neues Passwort eingeben")}
              required
            />
          </div>

          {passwordMessage && (
            <p className="form-message" style={{ color: passwordMessage.includes("성공") ? "var(--gh-success)" : "var(--gh-alert)" }}>
              {passwordMessage}
            </p>
          )}

          <button type="submit" className="submit-btn" style={{ background: "var(--gh-control-active)" }}>
            <BilingualButtonText ko="비밀번호 변경하기" de="Passwort ändern" />
          </button>
        </form>

        {/* 4. 내가 작성한 글 목록 */}
        <div style={{ borderTop: "1px solid var(--gh-border)", paddingTop: "30px", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>{t("내가 작성한 글", "Meine Beiträge")} ({myPosts.length})</h2>

          {postsLoading ? (
            <p style={{ color: "var(--gh-text-muted)", textAlign: "center", padding: "20px 0" }}>{t("작성한 글을 불러오는 중입니다...", "Beiträge werden geladen...")}</p>
          ) : postsError ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ color: "var(--gh-text-muted)", marginBottom: "10px" }}>{postsError}</p>
              <button
                type="button"
                onClick={handleRetryPosts}
                style={{
                  padding: "6px 12px",
                  background: "var(--gh-surface-muted)",
                  color: "var(--gh-text)",
                  border: "1px solid var(--gh-border)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {t("다시 시도", "Erneut versuchen")}
              </button>
            </div>
          ) : myPosts.length === 0 ? (
            <p style={{ color: "var(--gh-text-muted)", textAlign: "center", padding: "20px 0" }}>{t("작성한 게시글이 없습니다.", "Du hast noch keine Beiträge geschrieben.")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {myPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    padding: "14px",
                    border: "1px solid var(--gh-border)",
                    borderRadius: "6px",
                    background: "var(--gh-surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "12px", color: "var(--gh-accent)", fontWeight: "bold", marginRight: "8px" }}>
                      {CATEGORIES[post.category] ? t(...CATEGORIES[post.category]) : post.category}
                    </span>
                    <Link href={`/posts/${post.id}`} style={{ fontSize: "15px", fontWeight: "500", color: "var(--gh-text)", textDecoration: "none" }}>
                      {post.title}
                    </Link>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--gh-text-subtle)" }}>
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. 하단 계정 액션 (로그아웃 및 홈 이동) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--gh-border)", paddingTop: "20px" }}>
          <Link href="/" style={{ color: "var(--gh-text-muted)", fontSize: "14px", textDecoration: "none" }}>
            ← <BilingualButtonText ko="메인으로 돌아가기" de="Zur Startseite" />
          </Link>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              background: "var(--gh-alert)",
              color: "var(--gh-text-white)",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            <BilingualButtonText ko="로그아웃" de="Abmelden" />
          </button>
        </div>
        <div style={{ marginTop: 28 }}>
          <Link href="/profile/withdraw" style={{ color: "var(--gh-text-muted)", fontSize: 13, textUnderlineOffset: 3 }}>
            <BilingualButtonText ko="회원 탈퇴" de="Mitgliedschaft beenden" />
          </Link>
        </div>
      </div>
    </main>
  );
}
