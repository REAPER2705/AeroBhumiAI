# TESTING GUIDE - Complete End-to-End Flow
## AeroBhumiAI Citizen → Government Verification System

**Current Date**: September 24, 2026  
**System Status**: ✅ READY FOR TESTING  
**Build Status**: ✅ SUCCESSFUL  
**Servers**: ✅ RUNNING  

---

## QUICK START (5 MINUTES)

### Step 1: Open Application
```
URL: http://localhost:5173
Expected: AeroBhumiAI dashboard loads with Citizen mode selected
```

### Step 2: Create a Conflict Case (without evidence)
1. Click "Drone Upload" in left menu
2. Click "Skip Upload (Use Satellite)" 
3. Select any parcel (first one is pre-selected)
4. Click "Check Compliance" button
5. See red box: "Encroachment Detected"
6. Click red "Generate Report & Flag" button
7. On report_and_flag screen, **leave evidence EMPTY**
8. Click "Submit for Government Verification" button
   - **✅ VERIFY**: Button is ENABLED and works (this was the bug fix)
9. See confirmation: "Government Case Created"
10. **Copy the Case ID** (e.g., GOV-2026-001)

### Step 3: Government Reviews Case
1. Click "Government" mode button (top-left)
2. In right panel, open "Cases in Queue" dropdown
3. Select the "(Citizen - NEW)" case
4. Verify right panel shows:
   - Case ID matches copied ID
   - All conflict details
   - **Evidence snapshot section** (even though we didn't upload, should show option)
5. Click "Under Review" button
6. **✅ VERIFY**: Status updates immediately (no page refresh needed)

### Step 4: Citizen Tracks Case
1. Switch back to "Citizen" mode
2. Click "Track Case" in left menu
3. Enter the Case ID from Step 2
4. Click "Search"
5. **✅ VERIFY**: Case found and shows updated status "UNDER_REVIEW"

---

## DETAILED TEST SCENARIOS

### Test 1: Simple Case With Evidence Upload

**Goal**: Verify complete flow with evidence snapshot

**Steps**:
1. Go to Drone Upload
2. Select parcel, check compliance
3. See conflict → Click "Generate Report & Flag"
4. On report_and_flag screen:
   - Scroll to "Evidence Snapshot" section
   - Click upload button
   - Choose any image file from your computer
   - See preview of uploaded image
5. Verify "Spatial Verification Confidence" shows:
   - Score (e.g., "87")
   - Level (HIGH/MEDIUM/LOW)
   - Factors list (reasons for confidence)
6. Click "Submit for Government Verification"
7. See Case ID confirmation
8. Switch to Government mode
9. Open the citizen case
10. In right panel, scroll down to "Citizen Evidence Snapshot"
11. **✅ VERIFY**: The EXACT image you uploaded is displayed

---

### Test 2: Government Status Workflow

**Goal**: Verify all status transitions persist correctly

**Setup**: Have a citizen case created (use Test 1)

**Steps**:
1. In Government mode, open the citizen case
2. Click "Under Review" button
3. **✅ VERIFY**: 
   - Status badge changes color to blue
   - No page refresh needed
   - Change is immediate
4. Click "Request Field Verification" button
5. **✅ VERIFY**: Status now shows yellow "FIELD_VERIFICATION_REQUIRED"
6. Click "Mark Verified" button
7. **✅ VERIFY**: Status now shows green "VERIFIED"
8. Click "Resolve Case" button
9. **✅ VERIFY**: Status now shows gray "RESOLVED"
10. **WITHOUT CLICKING ANYTHING**, switch to Citizen mode
11. Go to "Track Case"
12. Search for the Case ID
13. **✅ VERIFY**: Status shows "RESOLVED" (no page refresh needed)

---

### Test 3: Multiple Independent Cases

**Goal**: Verify multiple cases can coexist and be tracked independently

**Steps**:
1. Create 3 different cases (use "Create New Audit" button each time)
   - Case 1: Submit WITHOUT evidence
   - Case 2: Submit WITH evidence (use different image than Case 1)
   - Case 3: Submit WITH evidence (use different image than Case 1 & 2)
2. Note the Case IDs (should be: GOV-2026-001, GOV-2026-002, GOV-2026-003)
3. Switch to Government mode
4. Open Case 1 in dropdown
   - Click "Under Review"
   - Click "Request Field Verification"
5. Open Case 2 in dropdown (different evidence image!)
   - Click "Mark Verified"
6. Open Case 3 in dropdown (third evidence image!)
   - Click "Resolve Case"
7. Switch to Citizen mode
8. Track Case 1
   - **✅ VERIFY**: Shows "FIELD_VERIFICATION_REQUIRED" status
   - No evidence shown (because we didn't upload)
9. Track Case 2
   - **✅ VERIFY**: Shows "VERIFIED" status
   - **Evidence snapshot shows second image**
10. Track Case 3
   - **✅ VERIFY**: Shows "RESOLVED" status
   - **Evidence snapshot shows third image**

---

### Test 4: Browser Refresh Persistence

**Goal**: Verify all data survives browser refresh

**Setup**: Have multiple cases with different statuses

**Steps**:
1. Create and update at least 2 cases (use Test 3)
2. In Citizen mode, go to "Track Case"
3. Search for Case 1
4. Note the status
5. **Press F5 to refresh browser**
6. Wait for page to reload
7. Go to "Track Case" again
8. Search for Case 1
9. **✅ VERIFY**: Status is IDENTICAL to before refresh
10. Repeat for Case 2
11. Switch to Government mode (after refresh)
12. Open Case 1 in dropdown
13. **✅ VERIFY**: Case detail shows SAME data
14. Evidence snapshot still displays correctly

---

### Test 5: Confidence Calculation Verification

**Goal**: Verify confidence score is calculated correctly

**Steps**:
1. Create a case WITH evidence upload
2. On report_and_flag screen, note the confidence values:
   - Score (0-100)
   - Level (HIGH/MEDIUM/LOW)
   - Factors listed
3. **Manual verification** of confidence logic:
   - If outside_percentage > 20% → Should contribute 30 points
   - If affected_area > 100 m² → Should contribute 15 points
   - If evidence uploaded → Should contribute 15 points
   - If conflict detected → Should contribute 10 points
   - Base score = 50
   - HIGH = 80+, MEDIUM = 60-79, LOW = <60
4. Switch to Government mode
5. Open the same case
6. In right panel, find "Spatial Verification Confidence" section
7. **✅ VERIFY**: 
   - Score matches what citizen saw
   - Level matches (HIGH/MEDIUM/LOW)
   - Factors are same

---

### Test 6: Case Dropdown Filtering

**Goal**: Verify government can distinguish citizen cases from mock cases

**Steps**:
1. In Government mode, open "Cases in Queue" dropdown
2. **✅ VERIFY**: 
   - Mock cases show "(Mock)" label
   - Citizen cases show "(Citizen - NEW)" label
   - Counter shows "(X citizen)" where X is count
3. Create a new citizen case
4. Wait 2 seconds (auto-refresh interval)
5. Open dropdown again
6. **✅ VERIFY**: New citizen case appears with "(Citizen - NEW)" label
7. Counter increased by 1

---

### Test 7: Auto-Refresh on Government Dashboard

**Goal**: Verify government dashboard automatically loads new cases

**Steps**:
1. In Government mode, note current case list in dropdown
2. Note the time shown in browser
3. **WITHOUT CLICKING ANYTHING**, wait 2.5 seconds
4. In another browser window (or mental note):
   - Create a new citizen case
   - Take note of the Case ID
5. Back in Government mode:
   - Open dropdown
   - **✅ VERIFY**: New case appears in dropdown
   - New case has "(Citizen - NEW)" label
   - Matches the Case ID from step 4

---

### Test 8: Evidence Snapshot Display Verification

**Goal**: Verify citizen-uploaded images display correctly on government side

**Steps**:
1. Create a citizen case with evidence upload
   - Use a distinctive image (screenshot, photo, etc.)
2. Copy the Case ID
3. Switch to Government mode
4. Open the citizen case
5. In right panel, scroll down to "Citizen Evidence Snapshot"
6. **✅ VERIFY**: 
   - Image is displayed (not a placeholder)
   - Image is EXACTLY the one uploaded
   - Dimensions correct (respects max-height styling)
   - File name shown below image
   - Image is NOT cut off or distorted

---

### Test 9: Government Notes Addition

**Goal**: Verify government can add notes that citizen sees

**Steps**:
1. Have a citizen case loaded in Government mode
2. Look for "Government Notes" section in right panel
3. Note: This section may appear after government takes action
4. If there's a notes field, add a test note:
   - "Verified by Officer Smith on 2026-09-24"
5. Switch to Citizen mode
6. Go to "Track Case"
7. Search for same Case ID
8. Scroll down to "Government Officer Notes"
9. **✅ VERIFY**: Your note appears

---

### Test 10: Error Handling

**Goal**: Verify system handles edge cases gracefully

**Scenario A - Invalid Case ID Search**:
1. Go to "Track Case"
2. Enter "INVALID-ID-12345"
3. Click Search
4. **✅ VERIFY**: Error message shows "No case found with ID: INVALID-ID-12345"

**Scenario B - Empty Search**:
1. Go to "Track Case"
2. Leave search field empty
3. Click Search
4. **✅ VERIFY**: Error message shows "Please enter a valid Case ID"

**Scenario C - Duplicate Case ID** (shouldn't happen):
1. Create multiple cases
2. **✅ VERIFY**: Each has unique Case ID (GOV-2026-001, GOV-2026-002, etc.)

---

## EXPECTED BEHAVIOR MATRIX

| Action | Expected Result | ✅ Pass? |
|--------|-----------------|---------|
| Submit without evidence | Case created | ☐ |
| Submit with evidence | Evidence displayed to government | ☐ |
| Government clicks "Under Review" | Status updates immediately | ☐ |
| Citizen searches case | Shows current government status | ☐ |
| Browser refresh | All data persists | ☐ |
| Create multiple cases | Each has unique ID | ☐ |
| Government updates status | Citizen sees update without refresh | ☐ |
| Evidence image upload | Exact image displayed to government | ☐ |
| Confidence calculation | Score + level + factors shown | ☐ |
| Auto-refresh | New cases appear in government dropdown | ☐ |

---

## TROUBLESHOOTING

### Issue: "Submit for Government Verification" button is disabled

**Expected**: Button should be ENABLED (this was the fix applied)
**If disabled**: 
- Check that `flagging` state is false
- Check that button logic is: `disabled={flagging}` (NOT including evidence check)
- Verify NewAudit.tsx line ~730 has correct button code

### Issue: Evidence snapshot doesn't show in government view

**Expected**: Actual uploaded image appears
**If not showing**:
- Check that base64 data URL is stored correctly in caseService.ts
- Check that GovernmentVerification.tsx displays the image
- Verify browser console for errors
- Check localStorage: `localStorage['aerobhumi_citizen_cases']` should contain evidenceDataUrl

### Issue: Case doesn't appear in government dropdown

**Expected**: Should appear within 2 seconds
**If not appearing**:
- Check that getAllGovernmentCases() includes citizen cases
- Verify citizen cases are saved to localStorage
- Check browser console for errors in case loading
- Try manual refresh (F5)

### Issue: Status doesn't update when government clicks button

**Expected**: Status updates immediately
**If not updating**:
- Check that handleCaseStatusUpdate() is called
- Verify updateCaseStatus() saves to localStorage
- Check browser console for errors
- Verify selectedCase is set correctly

### Issue: Citizen doesn't see government updates

**Expected**: Should see update without refresh
**If not seeing**:
- Check that getCaseById() reads from updated localStorage
- Verify status field in CitizenCase interface
- Try refreshing manually (F5)
- Check browser console for errors

---

## TECHNICAL VERIFICATION

### localStorage Keys to Check (in browser console)

```javascript
// View all citizen cases
console.log(JSON.parse(localStorage['aerobhumi_citizen_cases']));

// View case counter
console.log(localStorage['aerobhumi_case_counter']);

// Find specific case
const cases = JSON.parse(localStorage['aerobhumi_citizen_cases']);
const case1 = cases.find(c => c.caseId === 'GOV-2026-001');
console.log(case1);

// Check evidence data URL length
console.log(case1.evidenceDataUrl?.length);

// Check status
console.log(case1.status);
```

### Browser DevTools Checklist

- [ ] Console: No error messages
- [ ] Network: No failed API calls (OK for prototype - using localStorage)
- [ ] Application → LocalStorage → Check keys exist
- [ ] Application → LocalStorage → Can view case data

---

## PERFORMANCE NOTES

### Expected Speeds

- **Case creation**: <100ms (instant)
- **Status update**: <50ms (instant)
- **Case search**: <10ms (instant)
- **Case dropdown load**: <200ms (auto-refresh)
- **Page load**: <500ms (dev server with HMR)

### Memory Usage

- Storage needed per case: ~50KB (with image) to 1KB (without image)
- localStorage capacity: ~5-10MB (can store 100+ cases)

---

## SUCCESS CRITERIA

✅ **All tests pass if**:
1. Submit button works WITHOUT evidence
2. Cases are created with unique IDs
3. Evidence displays on government side
4. Status updates persist immediately
5. Citizen sees government updates without refresh
6. Multiple cases are independent
7. Data survives browser refresh
8. No errors in browser console

---

## SIGN-OFF

When all tests pass, implementation is verified complete:

**Tested By**: _________________  
**Date**: _________________  
**System Status**: ✅ PRODUCTION-READY (for prototype)  
**Notes**:

---

## NEXT STEPS AFTER TESTING

1. ✅ If all tests pass:
   - Document any issues found
   - Plan for production migration
   - Identify features to enhance

2. ❌ If tests fail:
   - Note specific failing test
   - Check troubleshooting section
   - Contact development team

---

**Testing Guide Version**: 1.0  
**Last Updated**: September 24, 2026  
**Status**: Ready for execution
