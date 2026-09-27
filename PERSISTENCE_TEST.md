# Citizen Case Persistence Test Plan

## Goal
Verify that citizen-created cases persist to localStorage and appear in both the citizen tracking interface and government dashboard.

## Test Setup
- Frontend: http://localhost:5173
- Backend: http://0.0.0.0:8000
- Open browser DevTools Console to see detailed logs

## Test Steps

### Step 1: Create a Case with Encroachment
1. Go to "New Audit" tab
2. Select a parcel from the dropdown (e.g., "PLOT-45")
3. Click "Skip Upload (Use Satellite)" to go to Audit Map
4. On the map:
   - Draw the legal parcel boundary (use Draw tools)
   - Draw a building that extends OUTSIDE the boundary (create encroachment)
5. Click "Check Compliance" button
6. Wait for spatial analysis to complete

### Step 2: Verify Spatial Analysis
- Confirm screen shows:
  - Metrics with "Building Area (Outside Parcel)" > 0
  - "Outside Percentage" > 0%
  - Red alert box showing "Encroachment Detected"
  - "Generate Report & Flag" button is visible (in red)

### Step 3: Submit Case for Government Review
1. Click "Generate Report & Flag" button
2. (Optional) Upload an evidence screenshot
3. Click "Submit for Government Verification" button
4. Watch console logs for:
   - `=== handleFlagForVerification called ===`
   - `✅ Generated caseId: GOV-YYYY-NNN`
   - `✅ Case saved to localStorage successfully`
   - `✅ Verification: Found X cases in localStorage`
5. Confirm green confirmation screen appears with Case ID

### Step 4: Verify Case in Track Case
1. Go to "Track Case" tab
2. Refresh the page (Ctrl+F5) to ensure data persists
3. Scroll down and you should see "Recent Cases" section OR
4. Manually enter the Case ID from step 3
5. Click "Search"
6. **VERIFY**: Case details appear with:
   - Case ID matches
   - Parcel ID matches
   - Status: "FLAGGED"
   - Spatial Confidence shows score and level
   - Evidence snapshot displays (if uploaded)

### Step 5: Verify Case in Government Dashboard
1. Go to "Government Verification" tab
2. Scroll to "Cases in Queue" section
3. **VERIFY**: Case appears in dropdown with label "(Citizen - NEW)"
4. Click on the case
5. **VERIFY**: Case details show:
   - Conflict type from citizen report
   - Affected area matches
   - Confidence score and level
   - Government can click status update buttons

### Step 6: Test Persistence on Browser Refresh
1. From Government dashboard, press Ctrl+F5 (hard refresh)
2. Go to "Track Case" tab
3. Search for the Case ID again
4. **VERIFY**: Case still appears (localStorage persistence works)

## Console Log Expectations

### When Creating Case
```
=== caseService.createCase called ===
params: {...}
✅ Generated caseId: GOV-2026-001
✅ Calculated confidence: {score: 75, level: "HIGH", factors: [...]}
📊 Evidence image size: 1234567 bytes
💾 Saving to localStorage...
  Current cases: 0
  Total cases to save: 1
  Single case size: 45678 bytes
  All cases total size: 45678 bytes (~44 KB)
✅ Case saved to localStorage successfully
✅ Verification: localStorage now contains: YES - data present
✅ Verification: Found 1 cases in localStorage
```

### When Loading Cases (Government)
```
=== getAllGovernmentCases called ===
  Mock cases: 1
  ✅ Citizen cases found: 1
    Citizen cases data: [...]
    Converting citizen case: GOV-2026-001
✅ Total cases to return: 2
```

## Possible Issues & Debugging

### Issue: Case not appearing in Track Case
**Check:**
1. Browser console for `getAllCases` logs
2. localStorage contains data: 
   - Open DevTools → Application → Local Storage
   - Look for key: `aerobhumi_citizen_cases`
3. Case ID format is correct (GOV-YYYY-NNN)

### Issue: "Missing required data to flag case" error
**Check:**
1. `buildCheckResult` is not null
2. `selectedParcelId` has a value
3. Both are being logged in console before error

### Issue: Evidence snapshot too large
**Expected behavior:**
1. If image > 2MB, it will be skipped
2. Console will show: `⚠️  Evidence image too large (>2MB)`
3. Case will still be saved without image data
4. Evidence filename will still be present

### Issue: localStorage quota exceeded
**Check:**
1. Clear localStorage: `localStorage.clear()` in console
2. Try again with smaller evidence image
3. Consider not uploading evidence for testing

## Success Criteria
- ✅ Case is created with unique ID (GOV-YYYY-NNN format)
- ✅ Case appears in localStorage (verified via DevTools)
- ✅ Case appears in Track Case after search
- ✅ Case appears in Government screen dropdown
- ✅ Case persists after page refresh (localStorage works)
- ✅ All confidence metrics display correctly
- ✅ Evidence snapshot displays (if uploaded)
- ✅ Government can update case status

## Notes
- The first run will show 1 case in localStorage
- Second run will show 2 cases, etc.
- Case counter: `aerobhumi_case_counter` in localStorage tracks the next case number
- Citizen case status starts as "FLAGGED"
- Government can change it to UNDER_REVIEW, FIELD_VERIFICATION_REQUIRED, VERIFIED, or RESOLVED
