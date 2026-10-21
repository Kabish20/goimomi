import { loadSalesIQOnInteraction } from '../../utils/salesiq';
import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import api from "../../api";

/**
 * ZohoLeadForm Component
 * Updated with the latest Zoho CRM Web-To-Lead snippet.
 */
const ZohoLeadForm = ({ isOpen, onClose }) => {
  const formRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    loadSalesIQOnInteraction();

    // 2. WebForm Analytics Tracking
    if (!document.getElementById('wf_anal')) {
      const s = document.createElement('script');
      s.id = 'wf_anal';
      s.src = 'https://crm.zohopublic.in/crm/WebFormAnalyticsServeServlet?rid=cde622e98f7942ba164c5ce71a7e612826cb68616d5a4aef5d7f322c50d9d000225d9e68318503e2fb3cf07bb9dd218egid0fe9a73839d69162756a1f89bedd485547cb496f7ab27f3396e683f5c984dabfgidf541afbfaac05d2d701a371d6283ca459eee0ef31e4bc2648c8e547d9a3f568bgid4f94531f003bee82574bef2c5ff2490a3683efac7f03460382243887f38c9ca2&tw=2ef601e1a4a980e4592591b550ce5396f0ffb88dfb181ecd8750d2f869dd6e97';
      document.body.appendChild(s);
    }

    // Lock scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Validation functions from Zoho snippet
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
        const firstnameObj = form['First Name'];
        if (firstnameObj) {
          name = firstnameObj.value + ' ' + name;
        }
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
    
    // Set charset for Zoho
    document.charset = "UTF-8";

    // Mandatory fields check from snippet
    const mndFields = ['First Name', 'Last Name', 'Email', 'Mobile'];
    const fldLangVal = ['FIRST NAME', 'LAST NAME', 'EMAIL ADDRESS', 'PHONE NUMBER'];

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
      const firstName = form['First Name']?.value || '';
      const lastName = form['Last Name']?.value || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Website Enquiry';
      const emailVal = form['Email']?.value || '';
      const mobileVal = form['Mobile']?.value || '';
      const descVal = form['Description']?.value || '';
      api.post('/api/enquiry-form/', {
        name: fullName,
        email: emailVal || null,
        phone: mobileVal,
        destination: 'General Enquiry Form',
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
      <div className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors z-10 text-gray-400 hover:text-gray-900 cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div id='crmWebToEntityForm' className='zcwf_lblTopBottom crmWebToEntityForm' style={{ backgroundColor: 'white', color: 'black', width: '100%', padding: '16px 18px', boxSizing: 'border-box', textAlign: 'left' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            #crmWebToEntityForm.zcwf_lblTopBottom * { box-sizing: border-box; direction: ltr; }
            .zcwf_lblTopBottom .zcwf_title { word-wrap: break-word; padding: 0px 20px 8px 0px; font-weight: 800; font-family: inherit; font-size: 13.5px; color: #14532d; line-height: 1.3; }
            .zcwf_lblTopBottom .zcwf_row { margin: 6px 0px; }
            .zcwf_lblTopBottom .zcwf_col_lab { font-size: 10px; font-family: inherit; padding: 0px 2px 3px; font-weight: 800; text-transform: uppercase; color: #374151; letter-spacing: 0.03em; }
            .zcwf_lblTopBottom .zcwf_col_fld { padding: 0px; position: relative; }
            .zcwf_lblTopBottom .zcwf_col_fld input[type=text], .zcwf_lblTopBottom .zcwf_col_fld textarea { 
              width: 100%; border: 1px solid #d1d5db !important; border-radius: 8px; padding: 6.5px 9px; font-family: inherit; font-size: 12px; outline: none; transition: all 0.2s; background: #f9fafb;
            }
            .zcwf_lblTopBottom .zcwf_col_fld input[type=text]:focus, .zcwf_lblTopBottom .zcwf_col_fld textarea:focus { 
              border-color: #16a34a !important; background: #ffffff; box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
            }
            .zcwf_lblTopBottom .formsubmit.zcwf_button { 
              color: white !important; background: #16a34a; border: none; padding: 7px 18px; cursor: pointer; font-weight: 700; border-radius: 8px; font-size: 12px; transition: background 0.2s;
            }
            .zcwf_lblTopBottom .formsubmit.zcwf_button:hover { background: #15803d; }
            .zcwf_lblTopBottom .zcwf_button { font-size: 12px; font-weight: 600; color: #4b5563; border: 1px solid #d1d5db; padding: 7px 14px; border-radius: 8px; cursor: pointer; margin-right: 6px; background: #fff; transition: all 0.2s; }
            .zcwf_lblTopBottom .zcwf_button:hover { background: #f3f4f6; }
          `}} />

          <div className='zcwf_title'>Welcome to Goimomi Holidays — Briefly share details with us.</div>
          
          <form 
            ref={formRef}
            id='webform482015000012389518' 
            action='https://crm.zoho.in/crm/WebToLeadForm' 
            name='WebToLeads482015000012389518' 
            method='POST' 
            onSubmit={handleZohoSubmit} 
            acceptCharset='UTF-8'
          >
            {/* Hidden Fields from Snippet */}
            <input type='text' style={{ display: 'none' }} name='xnQsjsdp' value='f98456093f3d9fa012da9b1f392957a6f9a73df303a1745e5005096696b06141' readOnly />
            <input type='hidden' name='zc_gad' id='zc_gad' value='' />
            <input type='text' style={{ display: 'none' }} name='xmIwtLD' value='ca4c8c8f45e08494ccd44bede0849324b1a1f04a724600548b754da18ce709e1f7ad4e6116a66e64846484a5dfaa8824' readOnly />
            <input type='text' style={{ display: 'none' }} name='actionType' value='TGVhZHM=' readOnly />
            <input type='text' style={{ display: 'none' }} name='returnURL' value='null' readOnly />
            <input type='text' style={{ display: 'none' }} id='ldeskuid' name='ldeskuid' readOnly />
            <input type='text' style={{ display: 'none' }} id='LDTuvid' name='LDTuvid' readOnly />
            <input type='text' style={{ display: 'none' }} name='aG9uZXlwb3Q' value='' readOnly />

            {/* Row 1: First Name & Last Name in 2 columns */}
            <div className="grid grid-cols-2 gap-2.5 my-1.5">
              <div className='zcwf_row' style={{ margin: 0 }}>
                <div className='zcwf_col_lab'><label htmlFor='First_Name'>FIRST NAME <span style={{ color: 'red' }}>*</span></label></div>
                <div className='zcwf_col_fld'>
                  <input type='text' id='First_Name' name='First Name' maxLength='40' placeholder="First name" />
                </div>
              </div>

              <div className='zcwf_row' style={{ margin: 0 }}>
                <div className='zcwf_col_lab'><label htmlFor='Last_Name'>LAST NAME <span style={{ color: 'red' }}>*</span></label></div>
                <div className='zcwf_col_fld'>
                  <input type='text' id='Last_Name' name='Last Name' maxLength='80' placeholder="Last name" />
                </div>
              </div>
            </div>

            {/* Row 2: Email Address & Phone Number in 2 columns */}
            <div className="grid grid-cols-2 gap-2.5 my-1.5">
              <div className='zcwf_row' style={{ margin: 0 }}>
                <div className='zcwf_col_lab'><label htmlFor='Email'>EMAIL ADDRESS <span style={{ color: 'red' }}>*</span></label></div>
                <div className='zcwf_col_fld'>
                  <input type='text' ftype='email' id='Email' name='Email' maxLength='100' placeholder="name@email.com" />
                </div>
              </div>

              <div className='zcwf_row' style={{ margin: 0 }}>
                <div className='zcwf_col_lab'><label htmlFor='Mobile'>PHONE NUMBER <span style={{ color: 'red' }}>*</span></label></div>
                <div className='zcwf_col_fld'>
                  <input type='text' id='Mobile' name='Mobile' maxLength='30' placeholder="+91 9876543210" />
                </div>
              </div>
            </div>

            {/* Row 3: Compact Message Field */}
            <div className='zcwf_row' style={{ margin: '6px 0 10px 0' }}>
              <div className='zcwf_col_lab'><label htmlFor='Description'>MESSAGE</label></div>
              <div className='zcwf_col_fld'>
                <textarea id='Description' name='Description' rows="2" placeholder="How can we help you?" style={{ height: '48px', resize: 'none' }}></textarea>
              </div>
            </div>

            {/* Submit & Reset Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <input type='submit' id='formsubmit' className='formsubmit zcwf_button' value='Submit' />
              <input type='reset' className='zcwf_button' value='Reset' />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ZohoLeadForm;
