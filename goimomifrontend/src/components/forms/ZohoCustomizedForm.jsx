import { loadSalesIQOnInteraction } from '../../utils/salesiq';
import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import api from "../../api";

/**
 * ZohoCustomizedForm Component
 * Minimized compact modal for Customized Holiday Plan enquiries synced with Zoho CRM Web-To-Lead.
 */
const ZohoCustomizedForm = ({ isOpen, onClose }) => {
  const formRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    loadSalesIQOnInteraction();

    // 2. WebForm Analytics Tracking
    if (!document.getElementById('wf_anal')) {
      const s = document.createElement('script');
      s.id = 'wf_anal';
      s.src = 'https://crm.zohopublic.in/crm/WebFormAnalyticsServeServlet?rid=46314d6cd7b797131d787c772cb7865cd4853f5d95033f4032a21156d985d8dfae25216eb11048cc8d21de461b59f221gid5036749f6a9d6d3ed175b8196ebb40789f85835fe8d57a23fa77a70936287653gid370d521989297dcb92397f5e9cbc97ef367beb18c4b4d4f987b22d7409834e9cgide4816e63337d809032a3a9d66f048901ddd49baf514674f90cb44424175ad2e0&tw=4bbf7e34fddd4ebed6b6920e5ae87ad327c76a5793bdac26016e52b360a121e6';
      document.body.appendChild(s);
    }

    // Lock scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validateEmail = (form) => {
    const emailFld = form.querySelectorAll('[ftype=email]');
    for (let i = 0; i < emailFld.length; i++) {
      const emailVal = emailFld[i].value;
      if (emailVal.trim().length !== 0) {
        const atpos = emailVal.indexOf('@');
        const dotpos = emailVal.lastIndexOf('.');
        if (atpos < 1 || dotpos < atpos + 2 || dotpos + 2 >= emailVal.length) {
          alert('Please enter a valid email address. ');
          emailFld[i].focus();
          return false;
        }
      }
    }
    return true;
  };

  const trackVisitor = (form) => {
    try {
      if (window.$zoho) {
        const LDTuvidObj = form['LDTuvid'];
        if (LDTuvidObj) {
          LDTuvidObj.value = window.$zoho.salesiq.visitor.uniqueid();
        }
        let name = form['Last Name'].value;
        window.$zoho.salesiq.visitor.name(name);
        const emailObj = form['Email'];
        if (emailObj) {
          window.$zoho.salesiq.visitor.email(emailObj.value);
        }
      }
    } catch {
      // SalesIQ tracking is optional and must not block form submission.
    }
  };

  const handleZohoSubmit = (e) => {
    const form = formRef.current;
    document.charset = "UTF-8";

    // Mandatory fields check from snippet
    const mndFields = ['Last Name', 'Mobile'];
    const fldLangVal = ['Full Name', 'Mobile'];

    for (let i = 0; i < mndFields.length; i++) {
      const fieldObj = form[mndFields[i]];
      if (fieldObj) {
        if (fieldObj.value.trim().length === 0) {
          alert(fldLangVal[i] + ' cannot be empty.');
          fieldObj.focus();
          e.preventDefault();
          return false;
        }
      }
    }

    trackVisitor(form);
    if (!validateEmail(form)) {
      e.preventDefault();
      return false;
    }

    try {
      const name = form['Last Name']?.value || 'Traveler';
      const emailVal = form['Email']?.value || '';
      const mobileVal = form['Mobile']?.value || '';
      const descVal = form['Description']?.value || '';
      api.post('/api/enquiry-form/', {
        name: name,
        email: emailVal || null,
        phone: mobileVal,
        destination: 'Customized Holiday Plan',
        purpose: descVal,
        enquiry_type: 'General',
      }).catch(err => console.warn('Backend enquiry sync notice:', err));
    } catch (err) {
      console.warn('Form parse notice:', err);
    }

    // Disable button to prevent double submit
    const submitBtn = form.querySelector('.formsubmit');
    if (submitBtn) submitBtn.setAttribute('disabled', 'true');

    return true;
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors z-10 text-gray-400 hover:text-gray-900 cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div id='crmWebToEntityForm' className='crmWebToEntityForm' style={{ backgroundColor: 'white', color: 'black', width: '100%', padding: '16px 20px', boxSizing: 'border-box', textAlign: 'left', maxHeight: '92vh', overflowY: 'auto' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            #crmWebToEntityForm * { box-sizing: border-box; direction: ltr; }
            .plan-title { word-wrap: break-word; padding: 0px 20px 8px 0px; font-weight: 800; font-family: inherit; font-size: 14.5px; color: #14532d; line-height: 1.3; border-bottom: 1px solid #f0fdf4; margin-bottom: 8px; }
            .plan-label { font-size: 9.5px; font-family: inherit; padding: 0px 2px 2px; font-weight: 800; text-transform: uppercase; color: #374151; letter-spacing: 0.03em; display: block; }
            .plan-input, .plan-select, .plan-textarea { 
              width: 100%; border: 1px solid #d1d5db !important; border-radius: 7px; padding: 5.5px 8px; font-family: inherit; font-size: 11.5px; outline: none; transition: all 0.2s; background: #f9fafb;
            }
            .plan-input:focus, .plan-select:focus, .plan-textarea:focus { 
              border-color: #10b981 !important; background: #ffffff; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
            }
            .plan-submit { 
              color: white !important; background: linear-gradient(135deg, #14532d 0%, #10b981 100%); border: none; padding: 7px 18px; cursor: pointer; font-weight: 700; border-radius: 7px; font-size: 12px; transition: transform 0.15s, opacity 0.15s;
            }
            .plan-submit:hover { opacity: 0.95; transform: translateY(-1px); }
            .plan-reset { font-size: 12px; font-weight: 600; color: #4b5563; border: 1px solid #d1d5db; padding: 7px 14px; border-radius: 7px; cursor: pointer; background: #fff; transition: all 0.2s; }
            .plan-reset:hover { background: #f3f4f6; }
          `}} />

          <div className='plan-title'>Customized Holiday Plan</div>
          
          <form 
            ref={formRef}
            id='webform482015000013976002' 
            action='https://crm.zoho.in/crm/WebToLeadForm' 
            name='WebToLeads482015000013976002' 
            method='POST' 
            onSubmit={handleZohoSubmit} 
            acceptCharset='UTF-8'
          >
            {/* Hidden Fields from Snippet */}
            <input type='text' style={{ display: 'none' }} name='xnQsjsdp' value='03b9acf6a7ad90ed00ac4114c3cb02dc577bcd07fd9c723926dfe8a069d83486' readOnly />
            <input type='hidden' name='zc_gad' id='zc_gad' value='' />
            <input type='text' style={{ display: 'none' }} name='xmIwtLD' value='473fcb54d6914b8d7d67d0dd1782aebb13ef302d2fd1c2c21f8b794832e51903836a2655572cd12f28d71ad68107e91e' readOnly />
            <input type='text' style={{ display: 'none' }} name='actionType' value='TGVhZHM=' readOnly />
            <input type='text' style={{ display: 'none' }} name='returnURL' value='null' readOnly />
            <input type='text' style={{ display: 'none' }} id='ldeskuid' name='ldeskuid' readOnly />
            <input type='text' style={{ display: 'none' }} id='LDTuvid' name='LDTuvid' readOnly />
            <input type='text' style={{ display: 'none' }} name='aG9uZXlwb3Q' value='' readOnly />

            {/* Row 1: Full Name & Mobile in 2 columns */}
            <div className="grid grid-cols-2 gap-2 my-1">
              <div>
                <label className="plan-label" htmlFor='Last_Name'>Full Name <span style={{ color: 'red' }}>*</span></label>
                <input className="plan-input" type='text' id='Last_Name' name='Last Name' maxLength='80' placeholder="Enter full name" />
              </div>
              <div>
                <label className="plan-label" htmlFor='Mobile'>Mobile <span style={{ color: 'red' }}>*</span></label>
                <input className="plan-input" type='text' id='Mobile' name='Mobile' maxLength='30' placeholder="+91" />
              </div>
            </div>

            {/* Row 2: Destination & Nights in 2 columns */}
            <div className="grid grid-cols-2 gap-2 my-1">
              <div>
                <label className="plan-label" htmlFor='LEADCF19'>Destination</label>
                <select className="plan-select" id='LEADCF19' name='LEADCF19'>
                  <option value='-None-'>-None-</option>
                  <option value='Domestic'>Domestic</option>
                  <option value='International'>International</option>
                </select>
              </div>
              <div>
                <label className="plan-label" htmlFor='LEADCF21'>Nights</label>
                <select className="plan-select" id='LEADCF21' name='LEADCF21'>
                  <option value='-None-'>-None-</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} {n===1?'Night':'Nights'}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: Starting City & Travel Date in 2 columns */}
            <div className="grid grid-cols-2 gap-2 my-1">
              <div>
                <label className="plan-label" htmlFor='LEADCF13'>Starting City</label>
                <input className="plan-input" type='text' id='LEADCF13' name='LEADCF13' maxLength='255' placeholder="City of departure" />
              </div>
              <div>
                <label className="plan-label" htmlFor='LEADCF119'>Travel Date</label>
                <input className="plan-input" type='text' id='LEADCF119' name='LEADCF119' placeholder='DD-MM-YYYY' onFocus={(e) => { e.target.type = 'date' }} onBlur={(e) => { if(!e.target.value) e.target.type = 'text' }} />
              </div>
            </div>

            {/* Row 4: Rooms, Adult Travelers, Child Travelers in 3 columns */}
            <div className="grid grid-cols-3 gap-2 my-1">
              <div>
                <label className="plan-label" htmlFor='LEADCF52'>Rooms</label>
                <input className="plan-input" type='text' id='LEADCF52' name='LEADCF52' maxLength='9' placeholder="No. of rooms" />
              </div>
              <div>
                <label className="plan-label" htmlFor='LEADCF55'>Adults</label>
                <input className="plan-input" type='text' id='LEADCF55' name='LEADCF55' maxLength='9' placeholder="No. of adults" />
              </div>
              <div>
                <label className="plan-label" htmlFor='LEADCF54'>Children</label>
                <input className="plan-input" type='text' id='LEADCF54' name='LEADCF54' maxLength='9' placeholder="No. of children" />
              </div>
            </div>

            {/* Row 5: Hotel Star Rating & Meal Plan in 2 columns */}
            <div className="grid grid-cols-2 gap-2 my-1">
              <div>
                <label className="plan-label" htmlFor='LEADCF17'>Hotel Star Rating</label>
                <select className="plan-select" id='LEADCF17' name='LEADCF17'>
                  <option value='-None-'>-None-</option>
                  <option value='3 Star'>3 Star</option>
                  <option value='4 Star'>4 Star</option>
                  <option value='5 Star'>5 Star</option>
                  <option value='Luxury'>Luxury</option>
                </select>
              </div>
              <div>
                <label className="plan-label" htmlFor='LEADCF20'>Meal Plan</label>
                <select className="plan-select" id='LEADCF20' name='LEADCF20'>
                  <option value='Select Meal Plan'>Select Meal Plan</option>
                  <option value='Breakfast Only (CP)'>Breakfast Only (CP)</option>
                  <option value='Breakfast + Dinner (MAP)'>Breakfast + Dinner (MAP)</option>
                  <option value='All Meals (AP)'>All Meals (AP)</option>
                  <option value='Room Only'>Room Only</option>
                </select>
              </div>
            </div>

            {/* Row 6: Holiday Type & Room Type in 2 columns */}
            <div className="grid grid-cols-2 gap-2 my-1">
              <div>
                <label className="plan-label" htmlFor='LEADCF18'>Holiday Type</label>
                <select className="plan-select" id='LEADCF18' name='LEADCF18'>
                  <option value='-None-'>-None-</option>
                  <option value='Family'>Family</option>
                  <option value='Honeymoon'>Honeymoon</option>
                  <option value='Adventure'>Adventure</option>
                  <option value='Religious'>Religious</option>
                </select>
              </div>
              <div>
                <label className="plan-label" htmlFor='LEADCF15'>Room Type</label>
                <input className="plan-input" type='text' id='LEADCF15' name='LEADCF15' maxLength='255' placeholder="e.g. Deluxe, Suite" />
              </div>
            </div>

            {/* Row 7: Nationality & Budget Per Person in 2 columns */}
            <div className="grid grid-cols-2 gap-2 my-1">
              <div>
                <label className="plan-label" htmlFor='LEADCF12'>Nationality</label>
                <input className="plan-input" type='text' id='LEADCF12' name='LEADCF12' maxLength='255' defaultValue="Indian" />
              </div>
              <div>
                <label className="plan-label" htmlFor='LEADCF66'>Budget / Person</label>
                <input className="plan-input" type='text' id='LEADCF66' name='LEADCF66' maxLength='16' placeholder="Estimated budget" />
              </div>
            </div>

            {/* Row 8: Transfer Details & Special Requests in 2 columns */}
            <div className="grid grid-cols-2 gap-2 my-1">
              <div>
                <label className="plan-label" htmlFor='LEADCF16'>Transfer Details</label>
                <input className="plan-input" type='text' id='LEADCF16' name='LEADCF16' maxLength='255' placeholder="Private, Shared, etc." />
              </div>
              <div>
                <label className="plan-label" htmlFor='LEADCF14'>Special Requests</label>
                <textarea className="plan-textarea" id='LEADCF14' name='LEADCF14' rows="1" placeholder="Inclusions / requirements" style={{ height: '28px', resize: 'none' }}></textarea>
              </div>
            </div>

            {/* Submit & Reset Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <input type='submit' id='formsubmit' className='formsubmit plan-submit' value='Submit Request' />
              <input type='reset' className='plan-reset' value='Reset' />
            </div>
          </form>
        </div>
        
        <p className="pb-3 text-center text-[8px] text-gray-400 font-bold uppercase tracking-[0.15em]">
            Secure CRM Integration • Privacy Protected
        </p>
      </div>
    </div>
  );
};

export default ZohoCustomizedForm;
