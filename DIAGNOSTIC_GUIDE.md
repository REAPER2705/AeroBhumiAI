# DIAGNOSTIC GUIDE - Debug Console Logging
**Status**: Detailed logging has been added to track the entire flow

---

## HOW TO CHECK WHAT'S HAPPENING

### Step 1: Open Browser DevTools
1. Open http://localhost:5173
2. Press **F12** to open Developer Tools
3. Click the **Console** tab
4. You'll see console logs as you interact with the app

---

## WHAT TO LOOK FOR

### Test Flow: Create a Case

**Step 1: Go to Spatial Analysis**
- Open "Drone Upload"
- Select parcel
- Click "Check Compliance"
- You should see a conflict detected (red box)

**Step 2: Click "Generate Report & Flag"**
- Look for console output:
  ```
  === handleGenerateReportAndFlag called ===
  Moving to report_and_flag step
  ```

**Step 3: On report_and_flag screen, click "Submit for Government Verification"**

**Look for these console messages in order:**

#### Message 1: Button Clicked
```
=== handleFlagForVerification called ===
selectedParcelId: P-003 (or whatever parcel)
buildCheckResult: {...}
```

#### Message 2: Case Creation Started
```
📝 Creating case...
  parcelId: P-003
  auditId: AUD-2025-019
  conflictResult: POTENTIAL_BUILDING_ENCROACHMENT
  affectedAreaM2: 62.45
  outsidePercentage: 12.49
```

#### Message 3: caseService.createCase Called
```
=== caseService.createCase called ===
params: {...}
✅ Generated caseId: GOV-2026-001
✅ Calculated confidence: {score: 87, level: "HIGH", factors: [...]}
💾 Saving to localStorage...
  Current cases: 0
✅ Case saved to localStorage
  Full case object: {...}
```

#### Message 4: Case Creation Success
```
✅ Case created successfully!
  Case ID: GOV-2026-001
  Full case: {...}
```

---

## WHAT IF SOMETHING GOES WRONG?

###  ❌ "Missing required data to flag case" error appears

**Meaning**: `buildCheckResult` is undefined

**Likely cause**: You didn't click "Check Compliance" first, or you closed the map
**Solution**: Go back to spatial analysis, click "Check Compliance" again

**Console should show:**
```
❌ Missing required data to flag case
  selectedParcelId: true
  buildCheckResult: false  ← This is the problem
```

---

### ❌ Button is clicked but nothing happens

**Meaning**: `handleFlagForVerification` is not being called

**Likely cause**: 
- JavaScript error preventing click handler
- Browser cache issue

**Solution**: 
1. Press **Ctrl+Shift+R** to do a hard refresh
2. Check console for any error messages
3. Open DevTools → Check "Console" tab for red errors

**Console should show:**
```
=== handleFlagForVerification called ===
```
If you don't see this, the click handler isn't being called.

---

### ❌ "Failed to flag case for verification" error appears

**Meaning**: An error occurred in `createCase()`

**Console should show:**
```
❌ Error creating case: [error details]
```

**Common errors**:
- `localStorage is full` - Clear browser data
- `JSON serialization error` - Invalid data format
- `Missing field X` - Check buildCheckResult has all fields

---

### ❌ Case is created but NOT appearing on government screen

**Meaning**: Case was saved to localStorage, but government isn't loading it

**Check 1: Verify case was saved**
1. In browser console, type:
```javascript
JSON.parse(localStorage['aerobhumi_citizen_cases'])
```
2. You should see your case object

**Check 2: Government loading cases**
- Switch to Government mode
- Look for console output:
```
=== loadCases called (government) ===
✅ Cases loaded: 1  ← Should include your case
  Cases: [...]
```

**Check 3: getAllGovernmentCases is fetching citizen cases**
- Look for:
```
=== getAllGovernmentCases called ===
  Mock cases: 1
  ✅ Citizen cases found: 1  ← Your case should be here
    Citizen cases data: [...]
    Converting citizen case: GOV-2026-001
✅ Total cases to return: 2  ← Mock (1) + Citizen (1)
```

If you see **0** citizen cases, check:
- Is `exportCasesForGovernment()` being called?
- Is `localStorage['aerobhumi_citizen_cases']` populated?

---

## STEP-BY-STEP DEBUGGING

### If button is not working:

1. **Check browser console for errors** (red messages)
2. **Press F5 to refresh** if you see any errors
3. **Check localStorage has data**:
   ```javascript
   console.log(localStorage.getItem('aerobhumi_citizen_cases'));
   ```
4. **Verify caseService is imported** in NewAudit.tsx
5. **Check the submit button onClick handler** is correctly defined

### If government is not seeing cases:

1. **Create a case first** (follow citizen flow)
2. **Verify localStorage has the case**:
   ```javascript
   JSON.parse(localStorage['aerobhumi_citizen_cases'])
   ```
3. **Switch to Government mode**
4. **Check console for loadCases logs**
5. **Check getAllGovernmentCases console logs**
6. **Manually check dropdown** in government interface

---

## COMMON SOLUTIONS

| Problem | Solution |
|---------|----------|
| Button not responding | Press F5 to refresh, check console for errors |
| Case not created | Verify buildCheckResult exists, check error message |
| Case created but not in dropdown | Check localStorage, wait 2 seconds for auto-refresh, switch to Gov mode |
| Wrong case showing | Clear localStorage and try again |
| Duplicate cases | Clear localStorage, refresh, try again |

---

## WHAT THESE LOGS TELL YOU

**If you see all these logs in order:**
```
=== handleFlagForVerification called ===
📝 Creating case...
=== caseService.createCase called ===
✅ Generated caseId: GOV-2026-001
💾 Saving to localStorage...
✅ Case saved to localStorage
✅ Case created successfully!
```
→ **Everything is working! Case was created.**

---

**If you switch to Government and see:**
```
=== loadCases called (government) ===
=== getAllGovernmentCases called ===
  Mock cases: 1
  ✅ Citizen cases found: 1
    Converting citizen case: GOV-2026-001
✅ Total cases to return: 2
```
→ **Government is loading your case! Check the dropdown.**

---

## NEXT STEPS

1. **Follow the test flow above**
2. **Open browser console (F12)**
3. **Note all console messages**
4. **Report what you see** and we can diagnose the exact issue

---

**This diagnostic logging will help us understand exactly where the flow is breaking.**
