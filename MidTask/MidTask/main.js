/* =========================================
   SCORM Handling
   ========================================= */

/* =========================================
   Quiz validation, grading, feedback
   ========================================= */

let form;
// Batch – ישמור את כל האינטראקציות כדי לשלוח ל-LMS
let interactionsBatch = [];

document.addEventListener('DOMContentLoaded', () => {
    // חיפוש יחידות ההכשרה
    setupUnitsSearch();

    // תפריט המבורגר
    const mainNav = document.getElementById('main-nav');
    const navToggleBtn = document.getElementById('nav-toggle');

    if (mainNav && navToggleBtn) {
        navToggleBtn.addEventListener('click', () => {
            const isOpen = mainNav.classList.toggle('is-open');
            navToggleBtn.setAttribute('aria-expanded', String(isOpen));
        });
    }

    // סגירת התפריט אוטומטית אחרי לחיצה על קישור
    const navLinks = document.querySelectorAll('#main-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav) mainNav.classList.remove('is-open');
        });
    });

    // שאלון
    form = document.getElementById('quiz-form');
    if (!form) return;

    // כפתור "שליחת משוב"
    form.addEventListener('submit', handleQuizSubmit);

    // כפתור "ניקוי טופס" (חדש)
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleFormReset);
    }

    // כפתור "הגשת ההכשרה לסיום"
    const finalizeBtn = document.getElementById('btn-finalize');
    if (finalizeBtn) {
        finalizeBtn.addEventListener('click', finalizeAndCloseLMSConnection);
    }
});

function handleQuizSubmit(e) {
    e.preventDefault();

    // בדיקת חובה באמצעות HTML5 validation
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Disable check button after successful check
    setCheckDisabled(true);

    // Collect feedback & build interactionsBatch
    const interactions = chackQuiz();
    console.log('[Quiz] Interactions:', interactions);

    // Enable final submission button
    setFinalizeDisabled(false);
}

// כפתור ניקוי טופס (חדש)
function handleFormReset() {
    // 1) ניקוי השדות (רדיו + טקסט)
    form.reset();

    // 2) מחיקת פידבקים שהודבקו לעמוד
    clearAllFeedback();

    // 3) איפוס האינטראקציות כדי שלא ישלחו נתונים ישנים
    interactionsBatch = [];

    // 4) החזרת מצב הכפתורים למצב התחלתי
    setCheckDisabled(false);
    setFinalizeDisabled(true);
}

// =========================================
//  chackQuiz – "שאלון משוב"
// =========================================
function chackQuiz() {
    clearAllFeedback();

    // איפוס האינטראקציות
    interactionsBatch = [];

    // -------------------------------
    // Q1 – משמעות ההכשרה
    // -------------------------------
    (function () {
        const article = document.getElementById('q1-title')?.closest('article');
        if (!article) return;

        const val = form.querySelector('input[name="q1"]:checked')?.value || '';
        const selectedText = getChosenRadioText(article, 'q1');

        const msg = 'תודה! המשוב על המשמעות יעזור לנו להבין מה עובד ומה דורש חיזוק.';
        setFeedback(article, true, msg, null, true);

        interactionsBatch.push({
            id: 'Q1_training_significance',
            type: 'likert',
            student_response: selectedText || val,
            result: 'neutral',
            correct_responses: ['אין תשובה נכונה בשאלה זו']
        });
    })();

    // -------------------------------
    // Q2 – כלים פרקטיים
    // -------------------------------
    (function () {
        const article = document.getElementById('q2-title')?.closest('article');
        if (!article) return;

        const val = form.querySelector('input[name="q2"]:checked')?.value || '';
        const selectedText = getChosenRadioText(article, 'q2');

        const msg = 'תודה! זה עוזר לנו לדייק את הכלים והדוגמאות למנטורים.';
        setFeedback(article, true, msg, null, true);

        interactionsBatch.push({
            id: 'Q2_practical_tools_rating',
            type: 'likert',
            student_response: selectedText || val,
            result: 'neutral',
            correct_responses: ['אין תשובה נכונה בשאלה זו']
        });
    })();

    // -------------------------------
    // Q3 – כלי/רעיון ליישום (תשובה פתוחה)
    // -------------------------------
    (function () {
        const article = document.getElementById('q3-title')?.closest('article');
        if (!article) return;

        const raw = (form.q3?.value || '').trim();

        const msg = 'תודה על השיתוף! נשמח לראות איך הכלי/הרעיון הזה בא לידי ביטוי בסדנה.';
        setFeedback(article, true, msg, null, true);

        interactionsBatch.push({
            id: 'Q3_next_workshop_takeaway',
            type: 'text',
            student_response: raw,
            result: 'neutral',
            correct_responses: ['אין תשובה נכונה בשאלה זו']
        });
    })();

    return interactionsBatch;
}

/* =========================================
   Units search
   ========================================= */

function setupUnitsSearch() {
    const searchForm = document.getElementById('units-search-form');
    const searchInput = document.getElementById('unit-search');
    const unitArticles = Array.from(document.querySelectorAll('#units-grid article'));

    if (!searchForm || !searchInput || unitArticles.length === 0) {
        return;
    }

    // לחיצה על כפתור "סינון"
    searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const term = searchInput.value.toLowerCase().trim();
        filterUnits(term, unitArticles);
    });

    // אם המשתמש מנקה את השדה – נחזיר את כל היחידות
    searchInput.addEventListener('input', function () {
        const term = searchInput.value.toLowerCase().trim();
        if (term === '') {
            filterUnits('', unitArticles);
        }
    });
}

function filterUnits(term, unitArticles) {
    unitArticles.forEach(article => {
        const card = article.querySelector('.unit-card');
        if (!card) return;

        const tag = (card.getAttribute('data-tag') || '').toLowerCase();
        const title = (card.querySelector('h3')?.textContent || '').toLowerCase();
        const desc = (card.querySelector('p.mb-0')?.textContent || '').toLowerCase();

        const haystack = `${tag} ${title} ${desc}`.trim();

        if (!term || haystack.includes(term)) {
            article.classList.remove('d-none');
        } else {
            article.classList.add('d-none');
        }
    });
}

/* =========================================
   Feedback UI helpers
   ========================================= */

function setFeedback(article, ok, message, ariaId, scrollToArticle) {
    // Remove old feedback
    const old = article.querySelector('.feedback');
    if (old) old.remove();

    const div = document.createElement('div');
    div.className = 'feedback mt-3 alert ' + (ok ? 'alert-success' : 'alert-danger');
    div.setAttribute('role', 'status');
    div.textContent = message;

    article.appendChild(div);

    if (scrollToArticle) {
        article.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function clearAllFeedback() {
    document.querySelectorAll('.feedback').forEach(el => el.remove());
}

function setCheckDisabled(disabled) {
    const btn = document.getElementById('btn-check');
    if (btn) btn.disabled = disabled;
}

function setFinalizeDisabled(disabled) {
    const btn = document.getElementById('btn-finalize');
    if (btn) btn.disabled = disabled;
}

function getChosenRadioText(article, qName) {
    const checked = article.querySelector(`input[name="${qName}"]:checked`);
    if (!checked) return '';
    const label = article.querySelector(`label[for="${checked.id}"]`);
    return (label?.textContent || '').trim();
}

/* =========================================
   SCORM integration – חיבורים להצלחה
   מסמן סיום הכשרה ושולח ל-LMS
   ========================================= */

function finalizeAndCloseLMSConnection() {
    try {
        if (window.pipwerks && pipwerks.SCORM) {
            // פתיחת חיבור ל-LMS
            pipwerks.SCORM.init();

            // שליחת לפחות 3 שדות נתונים מהמשתמש ל-LMS
            if (Array.isArray(interactionsBatch) && interactionsBatch.length >= 3) {
                const q1 = interactionsBatch[0]?.student_response || '';
                const q2 = interactionsBatch[1]?.student_response || '';
                const q3 = interactionsBatch[2]?.student_response || '';

                // שליחה (מינימלית) של 3 שדות
                pipwerks.SCORM.set("cmi.core.lesson_location", q1);   // שדה 1
                pipwerks.SCORM.set("cmi.comments", q2);               // שדה 2
                pipwerks.SCORM.set("cmi.suspend_data", "Q3: " + q3);  // שדה 3
            }

            // סימון מצב ההתקדמות כ"completed"
            pipwerks.SCORM.status("set", "completed");

            // שמירה וסגירה
            pipwerks.SCORM.save();
            pipwerks.SCORM.quit();
        } else {
            console.warn("SCORM API לא זמין – ייתכן שהקורס לא רץ מתוך LMS.");
        }

        // UI: show modal
        const modalEl = document.getElementById('modal-submit');
        const loadingState = document.getElementById('state-loading');
        const successState = document.getElementById('state-success');

        if (loadingState && successState) {
            loadingState.classList.add('d-none');
            successState.classList.remove('d-none');
        }

        if (window.bootstrap && modalEl) {
            const inst = bootstrap.Modal.getOrCreateInstance(modalEl);
            inst.show();
        } else {
            console.warn("Bootstrap Modal לא זמין – לא ניתן להציג את חלון האישור.");
        }
    } catch (err) {
        console.error("שגיאה בעדכון/שליחת נתונים ל-LMS:", err);
    }
}
