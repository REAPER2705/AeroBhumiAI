# Quick Test Guide - Case Persistence

## Prerequisites
- ✅ Frontend running: http://localhost:5173
- ✅ Backend running: http://0.0.0.0:8000
- ✅ Browser DevTools open (F12) with Console tab visible
- ✅ Clear localStorage first (optional but recommended)

### Clear localStorage (Optional)
In browser console:
```javascript
localStorage.clear()
sessionStorage.clear()
console.log('✅ Cleared all storage')
```

---

## QUICK TEST (5 minutes)

### Phase 1: Create a Case with Encroachment

1. **Go to "New Audit" tab** (top navigation)

2. **Select a parcel** (any in dropdown, e.g., "PLOT-45")

3. **Skip upload**: Click "Skip Upload (Use Satellite)"

4. **Draw shapes on the map**:
   - Draw the parcel boundary (green border)
   - Draw a building that goes OUTSIDE the boundary (create encroachment)
   - [You can just draw rough polygons - doesn't need to be perfect]

5. **Click "Check Compliance"** button
   - Wait for analysis (~2-3 seconds)
   - Should show red alert "Encroachment Detected"
   - Metrics should show "Building Area (Outside Parcel)" > 0

6. **Click "Generate Report & Flag"** button
   - Screen changes to report form

7. **Submit the case**:
   - Skip evidence (or upload screenshot if you want)
   - Click "Submit for Government Verification" button
   - Watch console for logs starting with `=== handleFlagForVerification called ===`

### Expected Console Output:
```
=== handleFlagForVerification called ===
✅ Data validation passed
=== caseService.createCase called ===
✅ Generated caseId: GOV-2026-001
✅ Case saved to localStorage successfully
✅ Verification: Found 1 cases in localStorage
CASE CREATION COMPLETE - Screen should now show confirmation
```

### Expected Result:
- Green confirmation screen with Case ID (e.g., "GOV-2026-001")
- Status: "Your case has been flagged for government verification"

---

### Phase 2: Verify Case Appears in Tracking

1. **Note your Case ID** from the confirmation screen

2. **Go to "Track Case" tab**

3. **Refresh page** (Ctrl+F5) to ensure localStorage persists

4. **Enter Case ID** in the search box

5. **Click Search** button

### Expected Result:
- Case details appear with:
  - Case ID matches what you submitted
  - Status: "FLAGGED"
  - Spatial Confidence: Shows score + level (e.g., "75% (HIGH)")
  - Conflict Details shows affected area and outside percentage
  - Evidence snapshot shows (if uploaded)

---

### Phase 3: Verify Case Appears in Government Dashboard

1. **Go to "Government Verification" tab**

2. **Scroll down** to "Cases in Queue" section

3. **Click dropdown** "Select a case"

### Expected Result:
- Your case appears in list with label "(Citizen - NEW)"
- Format: `GOV-YYYY-NNN (Citizen - NEW)`

4. **Click on your case** to select it

5. **Scroll down** to case details

### Expected Result:
- Case details show:
  - Conflict type from your report
  - Affected area matches what you created
  - Spatial Confidence score and level
  - Status buttons appear (Under Review, Field Verification, etc.)

6. **Click a status button** (e.g., "Under Review")

7. **Case status updates** in real-time

---

### Phase 4: Verify Persistence After Refresh

1. **Refresh page** (Ctrl+F5)

2. **Go back to "Track Case" tab**

3. **Search for your Case ID again**

### Expected Result:
- Case still appears (localStorage persists)
- Updated status shows (if you changed it in government dashboard)

---

## TROUBLESHOOTING

### Problem: "Missing required data to flag case" error

**Check console for**:
```
selectedParcelId: true/false
buildCheckResult: true/false
```

**If buildCheckResult is false**:
1. Go back to spatial analysis screen
2. Re-run "Check Compliance"
3. Wait for metrics to appear
4. Then try submit again

**If selectedParcelId is false**:
1. Go back to upload screen
2. Re-select a parcel
3. Continue from there

### Problem: Case not appearing in Track Case

**Check localStorage**:
1. Open DevTools → Application → Storage → Local Storage
2. Look for key: `aerobhumi_citizen_cases`
3. Click it to see the data
4. If empty: localStorage save failed (check console for errors)

**Check console logs**:
1. Search for: `✅ Case saved to localStorage successfully`
2. If missing: save failed, look for error message above it
3. Check for: `localStorage quota exceeded` (image too large)

### Problem: Evidence snapshot not showing

**This is OK if**:
- Console shows: `⚠️  Evidence image too large (>2MB)`
- Evidence filename still shows in case details
- This is intentional (image was skipped to fit in storage)

**To fix**:
- Submit again with smaller evidence image
- Or submit without evidence (still creates case)

### Problem: Government dashboard not refreshing

**Try**:
1. Refresh the page (F5)
2. Wait 2 seconds (auto-refresh interval)
3. Check console for `=== getAllGovernmentCases called ===`

**If still not showing**:
1. Make sure citizen case was created first
2. Check localStorage has the case data
3. Look for errors in console during getAllGovernmentCases

---

## CONSOLE COMMANDS FOR DEBUGGING

### Check if case was saved:
```javascript
const cases = JSON.parse(localStorage.getItem('aerobhumi_citizen_cases') || '[]')
console.log('Cases found:', cases.length)
cases.forEach((c, i) => console.log(i+1, ':', c.caseId, c.status))
```

### Check case counter:
```javascript
const counter = localStorage.getItem('aerobhumi_case_counter')
console.log('Next case number:', counter)
```

### Get specific case by ID:
```javascript
const cases = JSON.parse(localStorage.getItem('aerobhumi_citizen_cases') || '[]')
const found = cases.find(c => c.caseId === 'GOV-2026-001')
console.log('Found case:', found)
```

### Check session storage:
```javascript
console.log('buildCheckResult:', sessionStorage.getItem('currentBuildCheckResult') ? 'YES' : 'NO')
console.log('selectedParcelId:', sessionStorage.getItem('currentSelectedParcelId'))
```

### Clear all storage (start fresh):
```javascript
localStorage.clear()
sessionStorage.clear()
console.log('✅ All storage cleared')
```

---

## SUCCESS CHECKLIST

After completing all phases, verify:

- [ ] Case created with ID format GOV-YYYY-NNN
- [ ] Console shows `✅ Case saved to localStorage successfully`
- [ ] Case appears in Track Case when searched
- [ ] Case appears in Government Cases dropdown
- [ ] Case shows correct conflict details and metrics
- [ ] Case persists after page refresh
- [ ] No red error messages in console
- [ ] Government can update case status
- [ ] Evidence snapshot displays (if uploaded and <2MB)

**If all checkmarks pass**: ✅ **PERSISTENCE IS WORKING**

---

## EXPECTED DATA SIZES

For reference:
- Small case (no evidence): ~45 KB
- Case with screenshot: ~500-600 KB
- Multiple cases (5): ~250-300 KB total
- localStorage limit: 5-10 MB per domain

---

## RESET AND START OVER

To test multiple times:

```javascript
// Clear everything
localStorage.clear()
sessionStorage.clear()

// Refresh page
location.reload()

// Start from phase 1
```

---

**Total Test Time**: ~5-10 minutes
**Difficulty**: Easy - Just follow the steps
**Expected Result**: Cases persist to localStorage and appear in both UIs
