import { loadSalesIQOnInteraction } from '../../utils/salesiq';
import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import api from "../../api";

/**
 * ZohoCruiseForm Component
 * Minimized compact modal for Cruise enquiries synced with Zoho CRM Web-To-Lead.
 */
const ZohoCruiseForm = ({ isOpen, onClose }) => {
  const formRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    loadSalesIQOnInteraction();

    // 2. WebForm Analytics Tracking
    if (!document.getElementById('wf_anal')) {
      const s = document.createElement('script');
      s.id = 'wf_anal';
      s.src = 'https://crm.zohopublic.in/crm/WebFormAnalyticsServeServlet?rid=7368c4cda5b97e3ffd4904f12f38b410ad6a800e19a94727d5b778e5df488d8eee46a18e15dcabf8cfdca4b251fb32a2gidac61a9e28d6886309aec5390c781c2dd8547047e959baf5054b0e111f08ae4cegide4dd80880e862c2d39a2856cf8766252edbaae35b328b0f18aa7f55094db4013gid8f566533f9f3cd217c3aca05fe60fb316b8fa25258927d1f9440341551d563c2&tw=bd837f6c28568dc8cd5d342212f5b08b83564c342b1606bde6374f6f149dfbcd';
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
    const mndFields = ['Last Name', 'Email', 'Mobile'];
    const fldLangVal = ['Full Name', 'Email', 'Mobile'];

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
        destination: 'Cruise Holiday Enquiry',
        purpose: descVal,
        enquiry_type: 'Cruise',
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
      <div className="relative w-full max-w-[460px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors z-10 text-gray-400 hover:text-gray-900 cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div id='crmWebToEntityForm' className='crmWebToEntityForm' style={{ backgroundColor: 'white', color: 'black', width: '100%', padding: '16px 18px', boxSizing: 'border-box', textAlign: 'left' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            #crmWebToEntityForm * { box-sizing: border-box; direction: ltr; }
            .cruise-title { word-wrap: break-word; padding: 0px 20px 8px 0px; font-weight: 800; font-family: inherit; font-size: 14px; color: #14532d; line-height: 1.3; border-bottom: 1px solid #f0fdf4; margin-bottom: 8px; }
            .cruise-label { font-size: 10px; font-family: inherit; padding: 0px 2px 3px; font-weight: 800; text-transform: uppercase; color: #374151; letter-spacing: 0.03em; display: block; }
            .cruise-input, .cruise-textarea { 
              width: 100%; border: 1px solid #d1d5db !important; border-radius: 8px; padding: 6.5px 9px; font-family: inherit; font-size: 12px; outline: none; transition: all 0.2s; background: #f9fafb;
            }
            .cruise-input:focus, .cruise-textarea:focus { 
              border-color: #0284c7 !important; background: #ffffff; box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
            }
            .cruise-submit { 
              color: white !important; background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); border: none; padding: 7px 18px; cursor: pointer; font-weight: 700; border-radius: 8px; font-size: 12px; transition: transform 0.15s, opacity 0.15s;
            }
            .cruise-submit:hover { opacity: 0.95; transform: translateY(-1px); }
            .cruise-reset { font-size: 12px; font-weight: 600; color: #4b5563; border: 1px solid #d1d5db; padding: 7px 14px; border-radius: 8px; cursor: pointer; background: #fff; transition: all 0.2s; }
            .cruise-reset:hover { background: #f3f4f6; }
          `}} />

          <div className='cruise-title'>Cruise Enquiry</div>
          
          <form 
            ref={formRef}
            id='webform482015000013960190' 
            action='https://crm.zoho.in/crm/WebToLeadForm' 
            name='WebToLeads482015000013960190' 
            method='POST' 
            onSubmit={handleZohoSubmit} 
            acceptCharset='UTF-8'
          >
            {/* Hidden Fields from Snippet */}
            <input type='text' style={{ display: 'none' }} name='xnQsjsdp' value='913b4cee6f9d0d43455b9b429a994b8fae481b82d5dd5c053a380e216e4dd79a' readOnly />
            <input type='hidden' name='zc_gad' id='zc_gad' value='' />
            <input type='text' style={{ display: 'none' }} name='xmIwtLD' value='96d21536d8ae8ea725ef0a87dca8a1dc739fadb6d5462013c0902f01c23d8ccaf451b68d635945c6ab9f9087f69473d3' readOnly />
            <input type='text' style={{ display: 'none' }} name='actionType' value='TGVhZHM=' readOnly />
            <input type='text' style={{ display: 'none' }} name='returnURL' value='null' readOnly />
            <input type='text' style={{ display: 'none' }} id='ldeskuid' name='ldeskuid' readOnly />
            <input type='text' style={{ display: 'none' }} id='LDTuvid' name='LDTuvid' readOnly />
            <input type='text' style={{ display: 'none' }} name='aG9uZXlwb3Q' value='' readOnly />

            {/* Row 1: Full Name & Mobile in 2 columns */}
            <div className="grid grid-cols-2 gap-2.5 my-1.5">
              <div>
                <label className="cruise-label" htmlFor='Last_Name'>Full Name <span style={{ color: 'red' }}>*</span></label>
                <input className="cruise-input" type='text' id='Last_Name' name='Last Name' maxLength='80' placeholder="Enter full name" />
              </div>
              <div>
                <label className="cruise-label" htmlFor='Mobile'>Mobile <span style={{ color: 'red' }}>*</span></label>
                <input className="cruise-input" type='text' id='Mobile' name='Mobile' maxLength='30' placeholder="+91" />
              </div>
            </div>

            {/* Row 2: Email & Cruise Date in 2 columns */}
            <div className="grid grid-cols-2 gap-2.5 my-1.5">
              <div>
                <label className="cruise-label" htmlFor='Email'>Email <span style={{ color: 'red' }}>*</span></label>
                <input className="cruise-input" type='text' ftype='email' id='Email' name='Email' maxLength='100' placeholder="john@example.com" />
              </div>
              <div>
                <label className="cruise-label" htmlFor='LEADCF117'>Cruise Date</label>
                <input className="cruise-input" type='text' id='LEADCF117' name='LEADCF117' placeholder='DD-MM-YYYY' onFocus={(e) => { e.target.type = 'date' }} onBlur={(e) => { if(!e.target.value) e.target.type = 'text' }} />
              </div>
            </div>

            {/* Row 3: From City & To City in 2 columns */}
            <div className="grid grid-cols-2 gap-2.5 my-1.5">
              <div>
                <label className="cruise-label" htmlFor='LEADCF10'>From City</label>
                <input className="cruise-input" type='text' id='LEADCF10' name='LEADCF10' maxLength='255' placeholder="Departure city" />
              </div>
              <div>
                <label className="cruise-label" htmlFor='LEADCF5'>To City</label>
                <input className="cruise-input" type='text' id='LEADCF5' name='LEADCF5' maxLength='255' placeholder="Destination city" />
              </div>
            </div>

            {/* Row 4: Special Requests */}
            <div className="my-1.5">
              <label className="cruise-label" htmlFor='LEADCF9'>Special Requests</label>
              <textarea className="cruise-textarea" id='LEADCF9' name='LEADCF9' rows="2" placeholder="Any specific requirements or preferences?" style={{ height: '46px', resize: 'none' }}></textarea>
            </div>

            {/* Submit & Reset Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <input type='submit' id='formsubmit' className='formsubmit cruise-submit' value='Submit Enquiry' />
              <input type='reset' className='cruise-reset' value='Reset' />
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

export default ZohoCruiseForm;
