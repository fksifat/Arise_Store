import type { Metadata } from 'next';
import { PolicyPage } from '../_components/PolicyPage';
export const metadata: Metadata = {title:'Privacy notice draft | Arise', robots:{index:false,follow:false}};

export default function PrivacyPage() {
  return <PolicyPage title="Privacy notice" introduction="How the current Arise website builder handles account and website information." sections={[
    {title:'Account information',body:'Arise stores the name and email you provide, a password hash, and any optional contact information added through supported account or website tools. Plain-text account passwords are not saved in website setup drafts.'},
    {title:'Your website and store content',body:'The service stores website setup progress, page and blog drafts, published content, theme and brand settings. Online stores also store products, customer and delivery details, orders, and subscription or payment-review records needed by the existing commerce tools.'},
    {title:'Sign-in cookies and browser storage',body:'A session cookie keeps you signed in. Standard sessions use the configured session period; choosing Remember me requests a seven-day session. Signing out revokes that session. Browser storage also keeps carts and the active website selection. Setup progress is stored against your account on the server.'},
    {title:'Public content and external media',body:'Publishing makes the selected website content and public contact information available to visitors. Private drafts remain behind authenticated access. Images or media loaded from external URLs can connect the visitor’s browser to those providers, whose own policies apply.'},
    {title:'Operational records',body:'The application records technical request information and privileged-action audit events for operation and troubleshooting. Access controls separate accounts and website memberships. This draft does not claim a security certification or a particular regulatory compliance status.'},
    {title:'Details still to be finalised',body:'The operating entity, privacy contact, hosting and processor details, retention periods, deletion process and request-handling procedure must be confirmed by the owner. The current release does not provide a self-service account-deletion or password-recovery flow. These missing policy details must be resolved before this draft becomes a published notice.'},
  ]}/>;
}
