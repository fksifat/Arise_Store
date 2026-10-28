import type { Metadata } from 'next';
import { PolicyPage } from '../_components/PolicyPage';
export const metadata: Metadata = {title:'Terms of use draft | Arise', robots:{index:false,follow:false}};

export default function TermsPage() {
  return <PolicyPage title="Terms of use" introduction="Draft usage guidance for the Arise website builder. Final contractual terms require owner review." sections={[
    {title:'Your account',body:'Use accurate account details and keep your password private. Use remembered sign-in only on a device you control, and sign out on shared devices. Account registration and website setup are separate steps.'},
    {title:'Building and publishing',body:'Setup creates a private website draft when completed. Saving content does not publish it. Review pages, images, product information and contact details before explicitly publishing them. Only publish material you are authorised to use.'},
    {title:'Plans and payments',body:'Website creation starts the configured free trial. Plan limits and subscription status are shown in the workspace. The current product uses manual payment requests and administrator review; payment requests are not proof that funds were received. Final pricing, refund and cancellation terms still need to be confirmed by the owner.'},
    {title:'Online stores',body:'Store owners configure products, stock, delivery details and public store information. Existing checkout and fulfillment tools record orders, but the current release does not enable online customer payment gateways or courier integrations. Owners must provide accurate customer-facing sales and delivery information.'},
    {title:'Acceptable use',body:'Do not attempt to access another account or website without permission, interfere with the service, or publish unlawful or unauthorised content. Membership permissions and platform moderation continue to apply to website and store access.'},
    {title:'Final terms are pending',body:'The operating entity, service contact, contractual rights, cancellation/refund policy, liability provisions, dispute process and applicable jurisdiction have not been supplied. This draft does not establish those details or promise a service level. It needs owner and legal review before it is used as final contractual terms.'},
  ]}/>;
}
